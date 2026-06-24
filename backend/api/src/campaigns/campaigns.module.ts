import { PartialType } from '@nestjs/mapped-types';
import { Module, Body, Controller, Delete, Get, Injectable, Logger, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthGuard } from '@nestjs/passport';
import { IsArray, IsDateString, IsEnum, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';
import { CampaignStatus, MessageDirection, MessageKind, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { WhatsappBridgeService } from '../whatsapp-bridge/whatsapp-bridge.service';
import { WhatsappBridgeModule } from '../whatsapp-bridge/whatsapp-bridge.module';

// audience: filtros sobre Customer. Soportado:
//   tags   → clientes que tengan alguna de esas etiquetas ({} = todos)
//   phones → números sueltos pegados a mano (aunque no sean clientes)
interface Audience {
  tags?: string[];
  phones?: string[];
}

// Normaliza un teléfono peruano a E.164 (+51XXXXXXXXX). Devuelve null si no es válido.
function normalizePhonePE(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('51') && digits.length === 11) return '+' + digits;
  if (digits.length === 9 && digits.startsWith('9')) return '+51' + digits;
  if (digits.startsWith('51') && digits.length >= 10) return '+' + digits;
  return null; // descarta basura (muy corto, etc.)
}

// Parsea un texto libre de números (coma, espacio o salto de línea) a E.164 únicos.
function parsePhones(phones?: string[]): string[] {
  if (!phones?.length) return [];
  const out = new Set<string>();
  for (const raw of phones) {
    const norm = normalizePhonePE(raw);
    if (norm) out.add(norm);
  }
  return [...out];
}

class CreateCampaignDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() body?: string;            // mensaje a enviar
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;
  // Acepta null para poder "desprogramar" una campaña al editarla.
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() scheduledAt?: string | null;
  @IsOptional() @IsObject() audience?: Record<string, unknown>;
}
class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

class AudienceQueryDto {
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

@Injectable()
class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bridge: WhatsappBridgeService,
  ) {}

  findAll() { return this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } }); }

  async findOne(id: string) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }

  create(dto: CreateCampaignDto) {
    const { scheduledAt, audience, ...rest } = dto;
    return this.prisma.campaign.create({
      data: {
        ...rest,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        audience: audience as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.findOne(id);
    const { scheduledAt, audience, ...rest } = dto;
    // scheduledAt: si viene fecha la usa; si viene null la limpia (desprograma);
    // si no viene (undefined) la deja como está.
    const scheduledData =
      scheduledAt === undefined ? {} : { scheduledAt: scheduledAt ? new Date(scheduledAt) : null };
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...rest,
        ...scheduledData,
        audience: audience === undefined ? undefined : (audience as Prisma.InputJsonValue),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.campaign.delete({ where: { id } });
  }

  // ---- Audiencia: construye el filtro Prisma desde { tags } ----
  private audienceWhere(audience?: Audience): Prisma.CustomerWhereInput {
    const where: Prisma.CustomerWhereInput = {};
    if (audience?.tags?.length) {
      where.tags = { hasSome: audience.tags };
    }
    return where;
  }

  // Cuenta de destinatarios para un filtro de audiencia (preview "X destinatarios").
  countAudience(tags?: string[]) {
    return this.prisma.customer.count({ where: this.audienceWhere({ tags }) });
  }

  // ---- Envío masivo: manda el mensaje de la campaña a toda su audiencia ----
  async send(id: string) {
    const campaign = await this.findOne(id);
    if (!campaign.body) {
      throw new NotFoundException('La campaña no tiene mensaje configurado');
    }

    // 1) Resolver audiencia: clientes por etiqueta + números sueltos pegados.
    const audience = (campaign.audience as Audience) || {};
    const customers = await this.prisma.customer.findMany({
      where: this.audienceWhere(audience),
      select: { id: true, phone: true, fullName: true },
    });

    // Destinatarios finales por teléfono (dedup): primero los clientes.
    const byPhone = new Map<string, { phone: string; fullName: string | null }>();
    for (const c of customers) byPhone.set(c.phone, { phone: c.phone, fullName: c.fullName });
    // Luego los números sueltos que NO sean ya clientes (sin nombre → {nombre} vacío).
    for (const phone of parsePhones(audience.phones)) {
      if (!byPhone.has(phone)) byPhone.set(phone, { phone, fullName: null });
    }
    const recipients = [...byPhone.values()];

    // Marcar la campaña en ejecución
    await this.prisma.campaign.update({ where: { id }, data: { status: CampaignStatus.RUNNING } });

    let sent = 0;
    let failed = 0;

    // 2) Enviar a cada destinatario (best-effort: un fallo no detiene el resto)
    for (const c of recipients) {
      const remoteJid = c.phone.replace('+', '') + '@s.whatsapp.net';
      const body = this.personalize(campaign.body, c.fullName);
      try {
        await this.bridge.sendText(remoteJid, body);
        sent++;
        // Registrar el mensaje en la conversación del cliente (si existe)
        const convo = await this.prisma.conversation.findUnique({ where: { remoteJid } });
        if (convo) {
          await this.prisma.message.create({
            data: {
              conversationId: convo.id,
              direction: MessageDirection.OUTBOUND,
              kind: MessageKind.TEXT,
              status: MessageStatus.SENT,
              body,
              sentAt: new Date(),
            },
          });
        }
      } catch (err) {
        failed++;
        this.logger.warn(`Campaña ${id}: fallo al enviar a ${c.phone}: ${(err as Error).message}`);
      }
    }

    // 3) Guardar stats + estado final
    const stats = { audience: recipients.length, sent, failed, sentAt: new Date().toISOString() };
    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.COMPLETED, stats: stats as Prisma.InputJsonValue },
    });
  }

  // ---- Scheduler: cada minuto envía las campañas programadas cuya hora llegó ----
  @Cron('0 * * * * *')
  async processScheduled() {
    const now = new Date();
    const due = await this.prisma.campaign.findMany({
      where: { status: CampaignStatus.SCHEDULED, scheduledAt: { lte: now } },
      select: { id: true, name: true },
    });
    if (!due.length) return;
    this.logger.log(`Scheduler: enviando ${due.length} campaña(s) programada(s)`);
    for (const c of due) {
      try {
        await this.send(c.id);
      } catch (err) {
        this.logger.warn(`Scheduler: fallo al enviar campaña ${c.name}: ${(err as Error).message}`);
      }
    }
  }

  // Reemplaza {nombre} por el primer nombre del cliente.
  private personalize(body: string, fullName?: string | null): string {
    const firstName = (fullName || '').split(' ')[0] || '';
    return body.replace(/\{nombre\}/gi, firstName);
  }
}

@Controller('campaigns')
@UseGuards(AuthGuard('jwt'))
class CampaignsController {
  constructor(private readonly svc: CampaignsService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get('audience-count') audienceCount(@Query() q: AudienceQueryDto) {
    return this.svc.countAudience(q.tags).then((count) => ({ count }));
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateCampaignDto) { return this.svc.create(dto); }
  @Post(':id/send') send(@Param('id') id: string) { return this.svc.send(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ imports: [WhatsappBridgeModule], controllers: [CampaignsController], providers: [CampaignsService] })
export class CampaignsModule {}
