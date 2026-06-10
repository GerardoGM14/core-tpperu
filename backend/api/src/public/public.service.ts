import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageDirection, MessageKind, MessageStatus } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { WhatsappBridgeService } from '../whatsapp-bridge/whatsapp-bridge.service';

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

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly bridge: WhatsappBridgeService,
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
}
