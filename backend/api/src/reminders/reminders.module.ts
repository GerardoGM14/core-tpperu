import { PartialType } from '@nestjs/mapped-types';
import { Module, Body, Controller, Delete, Get, Injectable, Logger, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthGuard } from '@nestjs/passport';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { MessageDirection, MessageKind, MessageStatus, ReminderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { WhatsappBridgeService } from '../whatsapp-bridge/whatsapp-bridge.service';
import { WhatsappBridgeModule } from '../whatsapp-bridge/whatsapp-bridge.module';

// Una regla pre-trip guardada en Setting "reminders.pretrip".
interface PretripRule {
  id: string;        // R-48, R-24, R-12
  label: string;
  when: string;      // '-48h', '-24h', '-12h'
  active: boolean;
  template: string;  // código de Template (WSP_RECORDATORIO_24H)
}

// Reglas por defecto si el panel aún no guardó nada (espejo de settings.module).
const DEFAULT_RULES: PretripRule[] = [
  { id: 'R-48', label: '48 horas antes del tour', when: '-48h', active: true, template: 'WSP_RECORDATORIO_48H' },
  { id: 'R-24', label: '24 horas antes del tour', when: '-24h', active: true, template: 'WSP_RECORDATORIO_24H' },
  { id: 'R-12', label: '12 horas antes del tour', when: '-12h', active: true, template: 'WSP_RECORDATORIO_12H' },
];

// Texto de respaldo por offset, si la plantilla no existe en la BD.
const FALLBACK_BODY: Record<string, string> = {
  '-48h': '🌿 Hola {nombre}, faltan *48 horas* para tu tour *{paquete}*. Tu reserva está confirmada ✅\n\nTe escribimos pronto con el horario exacto y punto de encuentro.',
  '-24h': '⏰ Hola {nombre}, *24 horas* para el inicio de tu tour *{paquete}*.\n\nTe esperamos. Cualquier duda, escríbenos por aquí.',
  '-12h': '🎒 Hola {nombre}, *mañana viajas con TPP* ({paquete}).\n\nRecomendaciones: documento de identidad, bloqueador, repelente y ropa cómoda. ¡Nos vemos!',
};

// Convierte '-48h' / '-24h' / '-12h' a milisegundos antes del viaje.
function offsetMs(when: string): number {
  const m = /(-?\d+)\s*h/i.exec(when);
  const hours = m ? Math.abs(parseInt(m[1], 10)) : 24;
  return hours * 3_600_000;
}

function normalizePhonePE(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('51') && digits.length === 11) return '+' + digits;
  if (digits.length === 9 && digits.startsWith('9')) return '+51' + digits;
  if (digits.startsWith('51')) return '+' + digits;
  return '+' + digits;
}

class CreateReminderDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() body?: string;
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsEnum(ReminderStatus) status?: ReminderStatus;
}
class UpdateReminderDto extends PartialType(CreateReminderDto) {}

class TestReminderDto {
  @IsOptional() @IsString() phone?: string;                          // número individual (cualquier formato)
  @IsOptional() @IsArray() @IsString({ each: true }) customerIds?: string[]; // clientes de la lista
  @IsOptional() @IsString() template?: string; // código de plantilla
  @IsOptional() @IsString() when?: string;     // '-24h' para elegir fallback
  @IsOptional() @IsString() name?: string;     // nombre para personalizar (default "María")
  @IsOptional() @IsString() paquete?: string;  // paquete de ejemplo
}

@Injectable()
class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bridge: WhatsappBridgeService,
  ) {}

  // ---- CRUD básico (historial de recordatorios) ----
  findAll() { return this.prisma.reminder.findMany({ orderBy: { scheduledAt: 'desc' }, take: 200 }); }

  /**
   * Métricas reales para las tarjetas de la vista (sin datos inventados).
   * Solo cuenta lo que existe en la BD.
   */
  async stats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 3_600_000);

    const [enviadosHoy, programadosHoy, recordatoriosEnviados, campanasEnviadas, campanasProgramadas] = await Promise.all([
      // Recordatorios enviados hoy
      this.prisma.reminder.count({ where: { status: ReminderStatus.SENT, sentAt: { gte: startOfDay, lt: endOfDay } } }),
      // Recordatorios pendientes programados para hoy
      this.prisma.reminder.count({ where: { status: ReminderStatus.PENDING, scheduledAt: { gte: startOfDay, lt: endOfDay } } }),
      // Total histórico de recordatorios enviados
      this.prisma.reminder.count({ where: { status: ReminderStatus.SENT } }),
      // Campañas enviadas (completadas)
      this.prisma.campaign.count({ where: { status: 'COMPLETED' } }),
      // Campañas programadas pendientes
      this.prisma.campaign.count({ where: { status: 'SCHEDULED' } }),
    ]);

    return {
      recordatoriosHoy: { enviados: enviadosHoy, programados: programadosHoy, total: enviadosHoy + programadosHoy },
      recordatoriosEnviados,
      campanasEnviadas,
      campanasProgramadas,
    };
  }
  async findOne(id: string) {
    const r = await this.prisma.reminder.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    return r;
  }
  create(dto: CreateReminderDto) {
    return this.prisma.reminder.create({ data: { ...dto, scheduledAt: new Date(dto.scheduledAt) } });
  }
  async update(id: string, dto: UpdateReminderDto) {
    await this.findOne(id);
    const { scheduledAt, ...rest } = dto;
    return this.prisma.reminder.update({
      where: { id },
      data: { ...rest, scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined },
    });
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.reminder.delete({ where: { id } });
  }

  // ---- Motor de recordatorios pre-trip ----

  // Lee las reglas pre-trip desde Setting (o las por defecto).
  private async getRules(): Promise<PretripRule[]> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'reminders.pretrip' } });
    const value = (row?.value as { rules?: PretripRule[] }) || {};
    return value.rules?.length ? value.rules : DEFAULT_RULES;
  }

  // Resuelve el texto de una plantilla por código; cae al fallback por offset.
  private async resolveBody(templateCode: string | undefined, when: string): Promise<string> {
    if (templateCode) {
      const tpl = await this.prisma.template.findUnique({ where: { code: templateCode } });
      if (tpl?.body) return tpl.body;
    }
    return FALLBACK_BODY[when] || FALLBACK_BODY['-24h'];
  }

  // Sustituye {nombre} y {paquete}.
  private personalize(body: string, vars: { nombre?: string; paquete?: string }): string {
    return body
      .replace(/\{nombre\}/gi, (vars.nombre || '').split(' ')[0] || '')
      .replace(/\{paquete\}/gi, vars.paquete || 'tu tour');
  }

  /**
   * Envía un recordatorio a un número individual y/o a una lista de clientes
   * seleccionados. Personaliza {nombre} con el nombre real de cada cliente
   * (o el nombre de prueba para el número suelto). Best-effort por destinatario.
   */
  async sendTest(dto: TestReminderDto) {
    const body = await this.resolveBody(dto.template, dto.when || '-24h');

    // Destinatarios por teléfono (dedup): clientes seleccionados + número suelto.
    const byPhone = new Map<string, { phone: string; nombre: string }>();

    if (dto.customerIds?.length) {
      const customers = await this.prisma.customer.findMany({
        where: { id: { in: dto.customerIds } },
        select: { phone: true, fullName: true },
      });
      for (const c of customers) {
        const p = normalizePhonePE(c.phone);
        if (p) byPhone.set(p, { phone: p, nombre: c.fullName || '' });
      }
    }

    const single = dto.phone ? normalizePhonePE(dto.phone) : null;
    if (single && !byPhone.has(single)) {
      byPhone.set(single, { phone: single, nombre: dto.name || 'María' });
    }

    const recipients = [...byPhone.values()];
    if (!recipients.length) throw new Error('Elige al menos un destinatario válido');

    let sent = 0;
    let failed = 0;
    let preview = '';
    for (const r of recipients) {
      const text = this.personalize(body, { nombre: r.nombre, paquete: dto.paquete || 'Tarapoto 7d/6n' });
      if (!preview) preview = text;
      const remoteJid = r.phone.replace('+', '') + '@s.whatsapp.net';
      try {
        await this.bridge.sendText(remoteJid, text);
        sent++;
      } catch (err) {
        failed++;
        this.logger.warn(`Prueba recordatorio: fallo a ${r.phone}: ${(err as Error).message}`);
      }
    }
    return { ok: true, sent, failed, total: recipients.length, preview };
  }

  /**
   * Cron: cada 5 minutos revisa las reservas próximas y envía los
   * recordatorios pre-trip cuyo momento ya llegó y no se han enviado.
   * Idempotente: registra cada envío en Reminder (orderId + regla en metadata).
   */
  @Cron('0 */5 * * * *')
  async processDue() {
    const rules = (await this.getRules()).filter((r) => r.active);
    if (!rules.length) return;

    const now = Date.now();
    // Ventana: reservas cuyo viaje es en las próximas 72h (cubre -48h con margen)
    // y que aún no han empezado.
    const horizon = new Date(now + 72 * 3_600_000);
    const orders = await this.prisma.order.findMany({
      where: {
        travelDate: { gt: new Date(now), lte: horizon },
        status: { in: ['CONFIRMED', 'PAID'] },
      },
      include: { customer: true, package: true },
    });
    if (!orders.length) return;

    for (const order of orders) {
      if (!order.travelDate || !order.customer?.phone) continue;
      const travelMs = order.travelDate.getTime();

      for (const rule of rules) {
        const fireAt = travelMs - offsetMs(rule.when);
        // Disparable si el momento ya llegó pero no hace más de 6h (evita
        // enviar recordatorios viejos si el server estuvo caído mucho tiempo).
        if (fireAt > now || now - fireAt > 6 * 3_600_000) continue;

        // ¿Ya se envió este recordatorio para esta orden+regla?
        const already = await this.prisma.reminder.findFirst({
          where: { orderId: order.id, metadata: { path: ['ruleId'], equals: rule.id } },
        });
        if (already) continue;

        await this.fireReminder(order, rule);
      }
    }
  }

  // Envía un recordatorio concreto y lo registra (best-effort).
  private async fireReminder(
    order: { id: string; customerId: string; customer: { phone: string; fullName: string }; package: { name: string } | null },
    rule: PretripRule,
  ) {
    const body = await this.resolveBody(rule.template, rule.when);
    const text = this.personalize(body, { nombre: order.customer.fullName, paquete: order.package?.name });
    const remoteJid = order.customer.phone.replace('+', '') + '@s.whatsapp.net';

    // Registramos primero para reservar el "slot" anti-duplicado.
    const reminder = await this.prisma.reminder.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        body: text,
        scheduledAt: new Date(),
        status: ReminderStatus.PENDING,
        metadata: { ruleId: rule.id, when: rule.when } as Prisma.InputJsonValue,
      },
    });

    try {
      await this.bridge.sendText(remoteJid, text);
      // Registrar el mensaje en la conversación del cliente (si existe).
      const convo = await this.prisma.conversation.findUnique({ where: { remoteJid } });
      if (convo) {
        await this.prisma.message.create({
          data: {
            conversationId: convo.id,
            direction: MessageDirection.OUTBOUND,
            kind: MessageKind.TEXT,
            status: MessageStatus.SENT,
            body: text,
            sentAt: new Date(),
          },
        });
      }
      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: ReminderStatus.SENT, sentAt: new Date() },
      });
      this.logger.log(`Recordatorio ${rule.id} enviado a ${order.customer.phone} (orden ${order.id})`);
    } catch (err) {
      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: ReminderStatus.FAILED,
          metadata: { ruleId: rule.id, when: rule.when, error: (err as Error).message.slice(0, 200) } as Prisma.InputJsonValue,
        },
      });
      this.logger.warn(`Recordatorio ${rule.id} falló para ${order.customer.phone}: ${(err as Error).message}`);
    }
  }
}

@Controller('reminders')
@UseGuards(AuthGuard('jwt'))
class RemindersController {
  constructor(private readonly svc: RemindersService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get('stats') stats() { return this.svc.stats(); }
  @Post('test') test(@Body() dto: TestReminderDto) { return this.svc.sendTest(dto); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateReminderDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateReminderDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ imports: [WhatsappBridgeModule], controllers: [RemindersController], providers: [RemindersService] })
export class RemindersModule {}
