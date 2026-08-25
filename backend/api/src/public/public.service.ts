import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageDirection, MessageKind, MessageStatus, OrderChannel, OrderStatus, Prisma } from '@prisma/client';
import { FlowTriggerType } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { WhatsappBridgeService } from '../whatsapp-bridge/whatsapp-bridge.service';
import { EmailService, MailAttachment } from '../email/email.module';
import { FlowEngineService } from '../flows/flow-engine.service';

// Formatea céntimos PEN a "S/ 1,178.00" (formato que usa la landing).
function formatPEN(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  const value = cents / 100;
  return 'S/ ' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Normaliza un teléfono peruano a E.164 (+51XXXXXXXXX).
// Acepta "987654321", "+51 987 654 321", "51987654321", etc.
function normalizePhonePE(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('51') && digits.length === 11) return '+' + digits;      // 51 + 9 dígitos
  if (digits.length === 9 && digits.startsWith('9')) return '+51' + digits;      // celular peruano
  if (digits.startsWith('51')) return '+' + digits;                              // ya con código país
  return '+' + digits;                                                            // fallback
}

// Convierte "S/ 1,178.00" | "1178.00" | 1178 a céntimos. 0 si no se puede.
function parsePriceToCents(raw: string | number | undefined | null): number {
  if (raw == null) return 0;
  if (typeof raw === 'number') return Math.round(raw * 100);
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly bridge: WhatsappBridgeService,
    private readonly email: EmailService,
    private readonly flowEngine: FlowEngineService,
  ) {}

  /**
   * Devuelve los paquetes ACTIVOS con la forma EXACTA que consume
   * landing/src/data/paquetes.js — para que la landing solo cambie el
   * import por un fetch sin tocar el resto del código.
   */
  async listPackages() {
    const rows = await this.prisma.package.findMany({
      where: { status: 'ACTIVE', slug: { not: null } },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((p) => ({
      slug: p.slug,
      nombre: p.name,
      categoria: p.category ?? '',
      precio: formatPEN(p.priceCents),
      precioAntes: formatPEN(p.priceBeforeCents),
      descuento: p.discountLabel,
      tag: p.tag,
      imagen: p.imageUrl,
      galeria: p.gallery,
      incluye: p.includes,
    }));
  }

  async getPackageBySlug(slug: string) {
    const p = await this.prisma.package.findUnique({ where: { slug } });
    if (!p || p.status !== 'ACTIVE') return null;
    return {
      slug: p.slug,
      nombre: p.name,
      categoria: p.category ?? '',
      precio: formatPEN(p.priceCents),
      precioAntes: formatPEN(p.priceBeforeCents),
      descuento: p.discountLabel,
      tag: p.tag,
      imagen: p.imageUrl,
      galeria: p.gallery,
      incluye: p.includes,
    };
  }

  /**
   * Crea un lead desde el formulario público de la landing:
   *  - upsert del Cliente por teléfono (tag "lead-landing")
   *  - abre/actualiza una Conversación de WhatsApp
   *  - guarda el mensaje del lead
   *  - dispara un WhatsApp de bienvenida si la sesión está conectada
   */
  async createLead(input: { name: string; phone: string; message?: string; packageSlug?: string }) {
    const phone = normalizePhonePE(input.phone);
    if (!phone) {
      throw new Error('Teléfono inválido');
    }
    const remoteJid = phone.replace('+', '') + '@s.whatsapp.net';

    // 1) Upsert del cliente
    const customer = await this.prisma.customer.upsert({
      where: { phone },
      update: {
        fullName: input.name || undefined,
        notes: input.message || undefined,
      },
      create: {
        fullName: input.name || 'Lead sin nombre',
        phone,
        notes: input.message || null,
        tags: ['lead-landing'],
      },
    });

    // 2) Abrir/actualizar conversación
    const convo = await this.prisma.conversation.upsert({
      where: { remoteJid },
      update: {
        customerId: customer.id,
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
      create: {
        remoteJid,
        customerId: customer.id,
        displayName: input.name,
        chatType: 'individual',
        unreadCount: 1,
        lastMessageAt: new Date(),
      },
    });

    // 3) Guardar el mensaje del lead como nota del hilo (entrante de sistema)
    if (input.message) {
      await this.prisma.message.create({
        data: {
          conversationId: convo.id,
          direction: MessageDirection.INBOUND,
          kind: MessageKind.TEXT,
          status: MessageStatus.DELIVERED,
          body: `📩 Lead desde la web: ${input.message}`,
          deliveredAt: new Date(),
        },
      });
    }

    // 4) WhatsApp de bienvenida (best-effort: no falla el lead si WSP está caído)
    let welcomeSent = false;
    try {
      const status = (await this.bridge.status()) as { connected?: boolean };
      if (status?.connected) {
        const firstName = (input.name || '').split(' ')[0] || '';
        const welcome =
          `¡Hola ${firstName}! 🌿 Gracias por escribirnos a *TPP Perú*. ` +
          `Un asesor se pondrá en contacto contigo en breve para ayudarte a planificar tu viaje. ` +
          `¿Hay algún destino que te interese?`;
        await this.bridge.sendText(remoteJid, welcome);
        await this.prisma.message.create({
          data: {
            conversationId: convo.id,
            direction: MessageDirection.OUTBOUND,
            kind: MessageKind.TEXT,
            status: MessageStatus.SENT,
            body: welcome,
            sentAt: new Date(),
          },
        });
        welcomeSent = true;
      }
    } catch (err) {
      this.logger.warn(`No se pudo enviar WhatsApp de bienvenida: ${(err as Error).message}`);
    }

    return {
      ok: true,
      customerId: customer.id,
      conversationId: convo.id,
      welcomeSent,
    };
  }

  /**
   * Recibe un comprobante de pago (voucher) desde el checkout de la landing.
   * - upsert del Cliente por teléfono (tag "pago-voucher")
   * - abre/actualiza su Conversación de WhatsApp
   * - guarda el voucher como mensaje IMAGE (la imagen viaja en base64)
   * Así el equipo lo ve y verifica el pago desde el panel de Conversaciones.
   */
  async submitVoucher(input: {
    name: string;
    phone: string;
    method: string;
    voucherBase64: string;
    orderSummary?: string;
    total?: string;
  }) {
    const phone = normalizePhonePE(input.phone);
    if (!phone) {
      throw new Error('Teléfono inválido');
    }
    // Validación mínima del data URL de imagen.
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(input.voucherBase64);
    if (!match) {
      throw new Error('El comprobante debe ser una imagen válida');
    }
    const mimeType = match[1];
    const remoteJid = phone.replace('+', '') + '@s.whatsapp.net';

    const metodoLabel = input.method === 'yape' ? 'Yape/Plin' : 'Transferencia bancaria';

    // 1) Upsert del cliente
    const customer = await this.prisma.customer.upsert({
      where: { phone },
      update: { fullName: input.name || undefined },
      create: {
        fullName: input.name || 'Cliente sin nombre',
        phone,
        tags: ['pago-voucher'],
      },
    });

    // 2) Abrir/actualizar conversación
    const convo = await this.prisma.conversation.upsert({
      where: { remoteJid },
      update: {
        customerId: customer.id,
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
      create: {
        remoteJid,
        customerId: customer.id,
        displayName: input.name,
        chatType: 'individual',
        unreadCount: 1,
        lastMessageAt: new Date(),
      },
    });

    // 3) Nota de contexto del pago (texto)
    const resumen =
      `💳 *Comprobante de pago recibido*\n` +
      `Método: ${metodoLabel}\n` +
      (input.total ? `Total: ${input.total}\n` : '') +
      (input.orderSummary ? `Pedido:\n${input.orderSummary}` : '');
    await this.prisma.message.create({
      data: {
        conversationId: convo.id,
        direction: MessageDirection.INBOUND,
        kind: MessageKind.TEXT,
        status: MessageStatus.DELIVERED,
        body: resumen,
        deliveredAt: new Date(),
      },
    });

    // 4) El voucher como mensaje IMAGE (imagen en base64 en mediaUrl)
    const voucherMsg = await this.prisma.message.create({
      data: {
        conversationId: convo.id,
        direction: MessageDirection.INBOUND,
        kind: MessageKind.IMAGE,
        status: MessageStatus.DELIVERED,
        mediaUrl: input.voucherBase64,
        mediaMimeType: mimeType,
        mediaCaption: `Comprobante ${metodoLabel}`,
        deliveredAt: new Date(),
      },
    });

    return {
      ok: true,
      customerId: customer.id,
      conversationId: convo.id,
      messageId: voucherMsg.id,
    };
  }


  /**
   * Genera el siguiente código de reserva del año (TPP-2026-0001).
   * Se basa en el último código emitido, así que es correlativo y legible.
   */
  private async nextOrderCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TPP-${year}-`;
    const last = await this.prisma.order.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const n = last ? parseInt(last.code.slice(prefix.length), 10) || 0 : 0;
    return prefix + String(n + 1).padStart(4, '0');
  }

  /**
   * Registra en el módulo de ventas los paquetes de una reserva web.
   * Crea una Order por paquete del carrito (el modelo relaciona una orden con
   * un paquete). Best-effort: si un item no se puede resolver, se omite y el
   * resto sí queda registrado.
   *
   * `paid` indica si venía comprobante de pago: en ese caso la reserva entra
   * como PENDING pero con el monto en paidCents, para que el equipo verifique
   * el voucher antes de marcarla como pagada.
   */
  private async createOrdersFromCart(
    customerId: string,
    items: Array<{ slug?: string; nombre?: string; cantidad?: number; precio?: string | number }>,
    opts: { hasVoucher: boolean; notes?: string },
  ): Promise<{ codes: string[]; unmatched: string[] }> {
    const created: string[] = [];
    const unmatched: string[] = [];

    for (const item of items) {
      try {
        // Resolver el paquete: primero por slug, luego por nombre exacto.
        let pkg = item.slug
          ? await this.prisma.package.findUnique({ where: { slug: item.slug } })
          : null;
        if (!pkg && item.nombre) {
          pkg = await this.prisma.package.findFirst({ where: { name: item.nombre } });
        }
        if (!pkg) {
          // El catálogo de la landing y el de la BD están desincronizados.
          // No perdemos la venta: lo reportamos para que quede en la nota del
          // chat y en el correo, y el equipo lo registre a mano.
          this.logger.warn(`Reserva web: no se encontró el paquete "${item.nombre || item.slug}"; no se registró en ventas`);
          unmatched.push(item.nombre || item.slug || 'paquete desconocido');
          continue;
        }

        const pax = Math.max(1, Number(item.cantidad) || 1);
        // Preferimos el precio del catálogo (fuente de verdad) sobre el que
        // llega del navegador, que es manipulable.
        const unitCents = pkg.priceCents || parsePriceToCents(item.precio);
        const totalCents = unitCents * pax;

        const order = await this.prisma.order.create({
          data: {
            code: await this.nextOrderCode(),
            customerId,
            packageId: pkg.id,
            status: OrderStatus.PENDING,
            channel: OrderChannel.WEB,
            pax,
            totalCents,
            paidCents: opts.hasVoucher ? totalCents : 0,
            notes: opts.notes || null,
            metadata: {
              source: 'landing-checkout',
              hasVoucher: opts.hasVoucher,
            } as Prisma.InputJsonValue,
          },
        });
        created.push(order.code);
      } catch (err) {
        this.logger.warn(`Reserva web: no se pudo registrar el item "${item.nombre || item.slug}": ${(err as Error).message}`);
        unmatched.push(item.nombre || item.slug || 'paquete desconocido');
      }
    }

    return { codes: created, unmatched };
  }

  /**
   * Confirma una reserva desde el checkout:
   *  - registra/actualiza el cliente y deja nota en su conversación
   *  - envía email interno a TPP (con voucher adjunto si lo hay)
   *  - envía email de confirmación al cliente
   * Si SMTP no está configurado, igual guarda la reserva (no falla).
   */
  async confirmReservation(input: {
    name: string;
    phone: string;
    email: string;
    document?: string;
    comments?: string;
    orderSummary?: string;
    total?: string;
    voucherBase64?: string;
    items?: Array<{ slug?: string; nombre?: string; cantidad?: number; precio?: string | number }>;
  }) {
    const phone = normalizePhonePE(input.phone);
    if (!phone) throw new Error('Teléfono inválido');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new Error('Correo inválido');

    const remoteJid = phone.replace('+', '') + '@s.whatsapp.net';

    // 1) Upsert cliente + conversación (igual que el voucher)
    const customer = await this.prisma.customer.upsert({
      where: { phone },
      update: { fullName: input.name || undefined, email: input.email || undefined },
      create: {
        fullName: input.name || 'Cliente sin nombre',
        phone,
        email: input.email || null,
        tags: ['reserva-web'],
      },
    });
    const convo = await this.prisma.conversation.upsert({
      where: { remoteJid },
      update: { customerId: customer.id, lastMessageAt: new Date(), unreadCount: { increment: 1 } },
      create: {
        remoteJid,
        customerId: customer.id,
        displayName: input.name,
        chatType: 'individual',
        unreadCount: 1,
        lastMessageAt: new Date(),
      },
    });

    // 2) Registrar la reserva en el módulo de ventas (una Order por paquete).
    //    Sin esto la reserva solo existiría como nota de chat y correo.
    const { codes: orderCodes, unmatched } = await this.createOrdersFromCart(
      customer.id,
      input.items || [],
      { hasVoucher: !!input.voucherBase64, notes: input.comments },
    );

    // 3) Nota en la conversación
    const notaBody =
      `🧾 *Reserva confirmada desde la web*\n` +
      (orderCodes.length ? `Reserva: ${orderCodes.join(', ')}\n` : '') +
      (unmatched.length ? `⚠ Registrar a mano: ${unmatched.join(', ')}\n` : '') +
      `Cliente: ${input.name}\n` +
      `Doc: ${input.document || '—'} · ${input.email} · ${phone}\n` +
      (input.total ? `Total: ${input.total}\n` : '') +
      (input.orderSummary ? `Pedido:\n${input.orderSummary}\n` : '') +
      (input.comments ? `Comentarios: ${input.comments}` : '');
    await this.prisma.message.create({
      data: {
        conversationId: convo.id,
        direction: MessageDirection.INBOUND,
        kind: MessageKind.TEXT,
        status: MessageStatus.DELIVERED,
        body: notaBody,
        deliveredAt: new Date(),
      },
    });

    // 3) Adjunto del voucher (si vino)
    const attachments: MailAttachment[] = [];
    const voucherMatch = input.voucherBase64
      ? /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(input.voucherBase64)
      : null;
    if (voucherMatch) {
      const ext = voucherMatch[1].split('/')[1] || 'png';
      attachments.push({
        filename: `comprobante.${ext}`,
        content: Buffer.from(voucherMatch[2], 'base64'),
        contentType: voucherMatch[1],
      });
    }

    // 4) Email interno a TPP
    const internalTo = this.config.get<string>('RESERVATIONS_EMAIL') || this.config.get<string>('SMTP_USER') || '';
    const pedidoHtml = (input.orderSummary || '').replace(/\n/g, '<br>');
    let emailToTpp = false;
    let emailToCustomer = false;
    if (internalTo) {
      emailToTpp = await this.email.send({
        to: internalTo,
        subject: `🧾 Nueva reserva web — ${input.name}`,
        html: `
          <h2 style="font-family:Arial,sans-serif;color:#191505">Nueva reserva desde la web</h2>
          ${orderCodes.length ? `<p style="font-family:Arial,sans-serif;font-size:14px"><b>Registrada en el panel como:</b> ${orderCodes.join(', ')}</p>` : ''}
          ${unmatched.length ? `<p style="font-family:Arial,sans-serif;font-size:14px;color:#cc140d"><b>⚠ Registrar a mano</b> (no están en el catálogo del panel): ${unmatched.join(', ')}</p>` : ''}
          <table style="font-family:Arial,sans-serif;font-size:14px;color:#333">
            <tr><td><b>Cliente:</b></td><td>${input.name}</td></tr>
            <tr><td><b>Documento:</b></td><td>${input.document || '—'}</td></tr>
            <tr><td><b>Correo:</b></td><td>${input.email}</td></tr>
            <tr><td><b>Celular:</b></td><td>${phone}</td></tr>
            <tr><td><b>Total:</b></td><td>${input.total || '—'}</td></tr>
          </table>
          <p style="font-family:Arial,sans-serif;font-size:14px"><b>Pedido:</b><br>${pedidoHtml || '—'}</p>
          ${input.comments ? `<p style="font-family:Arial,sans-serif;font-size:14px"><b>Comentarios:</b> ${input.comments}</p>` : ''}
          ${voucherMatch ? '<p style="font-family:Arial,sans-serif;font-size:13px;color:#5b6d12">✓ Comprobante de pago adjunto.</p>' : '<p style="font-family:Arial,sans-serif;font-size:13px;color:#cc140d">⚠ Sin comprobante adjunto.</p>'}
        `,
        attachments,
      });
    }

    // 5) Email de confirmación al cliente
    emailToCustomer = await this.email.send({
      to: input.email,
      subject: 'TPP Perú · Recibimos tu reserva 🌿',
      html: `
        <div style="font-family:Arial,sans-serif;color:#191505">
          <h2>¡Gracias por tu reserva, ${input.name.split(' ')[0]}!</h2>
          <p style="font-size:14px;color:#333">Recibimos tu solicitud de reserva. Un asesor de TPP Perú revisará tu pago y se pondrá en contacto contigo muy pronto para confirmar los detalles.</p>
          ${input.total ? `<p style="font-size:14px"><b>Total:</b> ${input.total}</p>` : ''}
          ${input.orderSummary ? `<p style="font-size:14px"><b>Tu pedido:</b><br>${pedidoHtml}</p>` : ''}
          <p style="font-size:13px;color:#777">Si tienes dudas, escríbenos por WhatsApp. ¡Nos vemos en Tarapoto! 🌴</p>
        </div>
      `,
    });

    // 6) Disparar flujos automáticos de "pago confirmado" (best-effort).
    try {
      await this.flowEngine.trigger(FlowTriggerType.PAYMENT_CONFIRMED, customer.id);
    } catch (err) {
      this.logger.warn(`No se pudieron disparar flujos PAYMENT_CONFIRMED: ${(err as Error).message}`);
    }

    return {
      ok: true,
      customerId: customer.id,
      conversationId: convo.id,
      orderCodes,
      emailEnabled: this.email.enabled,
      emailToTpp,
      emailToCustomer,
    };
  }
}
