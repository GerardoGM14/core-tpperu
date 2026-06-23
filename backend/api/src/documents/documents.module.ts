import { PartialType } from '@nestjs/mapped-types';
import { Module, Body, Controller, Delete, Get, Injectable, Logger, NotFoundException, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Cron } from '@nestjs/schedule';
import { Response } from 'express';
import { ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentKind, DocumentDeliveryStatus, MessageDirection, MessageKind, MessageStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { PrismaService } from '../shared/prisma.service';
import { WhatsappBridgeModule } from '../whatsapp-bridge/whatsapp-bridge.module';
import { WhatsappBridgeService } from '../whatsapp-bridge/whatsapp-bridge.service';

// Carpeta donde se guardan los archivos subidos de documentos.
const UPLOADS_DIR = join(process.cwd(), 'uploads', 'documents');

class CreateDocumentDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsEnum(DocumentKind) kind?: DocumentKind;
  @IsOptional() @IsString() packageId?: string;
  @IsString() fileUrl: string;
  @IsOptional() fileSize?: number;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}

class UploadDocumentDto {
  @IsString() data: string;       // base64
  @IsString() mime: string;
  @IsString() filename: string;
}

// Envío de un documento a uno o varios clientes (inmediato o programado).
class SendDocumentDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) customerIds: string[];
  @IsOptional() @IsString() caption?: string;
  // Si viene scheduledAt en el futuro, queda programado; si no, se envía ya.
  @IsOptional() @IsDateString() scheduledAt?: string;
}

@Injectable()
class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bridge: WhatsappBridgeService,
  ) {}

  /** Guarda un archivo subido (base64) en disco y devuelve su URL servible. */
  async saveUpload(dto: UploadDocumentDto) {
    const buffer = Buffer.from(dto.data, 'base64');
    await mkdir(UPLOADS_DIR, { recursive: true });
    // nombre estable por contenido + extensión del filename original
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 24);
    const ext = (dto.filename.match(/\.[a-z0-9]+$/i)?.[0] || '').toLowerCase();
    const name = hash + ext;
    await writeFile(join(UPLOADS_DIR, name), buffer);
    return {
      fileUrl: `/api/documents/file/${name}`,
      fileSize: buffer.length,
      mimeType: dto.mime,
    };
  }

  findAll() { return this.prisma.document.findMany({ orderBy: { createdAt: 'desc' } }); }
  async findOne(id: string) {
    const d = await this.prisma.document.findUnique({ where: { id } });
    if (!d) throw new NotFoundException();
    return d;
  }
  create(dto: CreateDocumentDto) { return this.prisma.document.create({ data: dto }); }
  async update(id: string, dto: UpdateDocumentDto) {
    await this.findOne(id);
    return this.prisma.document.update({ where: { id }, data: dto });
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.document.delete({ where: { id } });
  }

  /** Lista las etiquetas distintas de los clientes con su conteo, para los
   *  filtros del modal de envío (ej. "sabado-laguna-azul": 12). */
  async customerTags() {
    const customers = await this.prisma.customer.findMany({ select: { tags: true } });
    const counts = new Map<string, number>();
    for (const c of customers) {
      for (const t of c.tags) counts.set(t, (counts.get(t) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Programa o envía un documento a una lista de clientes.
   * Crea un DocumentDelivery por cliente. Si scheduledAt es futuro, quedan
   * SCHEDULED (el cron los enviará); si no, se envían de inmediato.
   */
  async sendToCustomers(documentId: string, dto: SendDocumentDto) {
    const doc = await this.findOne(documentId);
    if (!doc.fileUrl.includes('/api/documents/file/')) {
      throw new NotFoundException('El documento no tiene un archivo subido. Edítalo y sube el archivo.');
    }

    const when = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date();
    const isFuture = when.getTime() > Date.now() + 30_000; // margen de 30s

    // Un registro de envío por cliente.
    const deliveries = await this.prisma.$transaction(
      dto.customerIds.map((customerId) =>
        this.prisma.documentDelivery.create({
          data: {
            documentId,
            customerId,
            caption: dto.caption || null,
            scheduledAt: when,
            status: DocumentDeliveryStatus.SCHEDULED,
          },
        }),
      ),
    );

    if (isFuture) {
      return { scheduled: deliveries.length, sent: 0, failed: 0, scheduledAt: when.toISOString() };
    }

    // Envío inmediato: procesa ahora mismo cada delivery.
    let sent = 0;
    let failed = 0;
    for (const d of deliveries) {
      const ok = await this.processDelivery(d.id);
      if (ok) sent++;
      else failed++;
    }
    return { scheduled: 0, sent, failed };
  }

  /** Envía un DocumentDelivery concreto por WhatsApp. Devuelve true si fue OK. */
  private async processDelivery(deliveryId: string): Promise<boolean> {
    const delivery = await this.prisma.documentDelivery.findUnique({
      where: { id: deliveryId },
      include: { document: true, customer: true },
    });
    if (!delivery || delivery.status === DocumentDeliveryStatus.SENT) return false;

    try {
      const { document: doc, customer } = delivery;
      if (!customer.phone) throw new Error('El cliente no tiene teléfono');

      // Cargar el archivo subido.
      const m = doc.fileUrl.match(/\/api\/documents\/file\/(.+)$/);
      if (!m) throw new Error('El documento no tiene archivo subido');
      const fileName = basename(m[1]);
      const buffer = await readFile(join(UPLOADS_DIR, fileName));
      const dataB64 = buffer.toString('base64');
      const mime = doc.mimeType || 'application/pdf';

      // Resolver/crear la conversación del cliente.
      const remoteJid = customer.phone.replace('+', '') + '@s.whatsapp.net';
      const convo = await this.prisma.conversation.upsert({
        where: { remoteJid },
        update: { customerId: customer.id },
        create: {
          remoteJid,
          customerId: customer.id,
          displayName: customer.fullName,
          chatType: 'individual',
        },
      });

      // Enviar por WhatsApp.
      const result = (await this.bridge.sendMedia(
        remoteJid, dataB64, mime, delivery.caption || undefined, doc.name,
      )) as { id?: string; timestamp?: number };

      // Registrar el mensaje saliente en la conversación.
      const sentAt = result?.timestamp ? new Date(result.timestamp * 1000) : new Date();
      await this.prisma.message.create({
        data: {
          conversationId: convo.id,
          externalId: result?.id ?? null,
          direction: MessageDirection.OUTBOUND,
          kind: MessageKind.DOCUMENT,
          status: MessageStatus.SENT,
          body: delivery.caption ?? null,
          mediaCaption: delivery.caption ?? null,
          mediaMimeType: mime,
          sentAt,
        },
      });
      await this.prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: sentAt } });

      // Marcar entregado + contar el envío en el documento.
      await this.prisma.$transaction([
        this.prisma.documentDelivery.update({
          where: { id: delivery.id },
          data: { status: DocumentDeliveryStatus.SENT, sentAt, conversationId: convo.id, errorReason: null },
        }),
        this.prisma.document.update({ where: { id: doc.id }, data: { sentCount: { increment: 1 } } }),
      ]);
      return true;
    } catch (err) {
      await this.prisma.documentDelivery.update({
        where: { id: delivery.id },
        data: { status: DocumentDeliveryStatus.FAILED, errorReason: (err as Error).message.slice(0, 300) },
      });
      this.logger.warn(`Envío de documento ${deliveryId} falló: ${(err as Error).message}`);
      return false;
    }
  }

  /** Cron: cada minuto envía los documentos programados cuya fecha ya venció. */
  @Cron('15 * * * * *')
  async processScheduled() {
    const due = await this.prisma.documentDelivery.findMany({
      where: { status: DocumentDeliveryStatus.SCHEDULED, scheduledAt: { lte: new Date() } },
      select: { id: true },
      take: 50,
    });
    for (const d of due) {
      await this.processDelivery(d.id);
    }
  }

  /** Envíos programados pendientes (para mostrarlos en el panel). */
  scheduledList() {
    return this.prisma.documentDelivery.findMany({
      where: { status: DocumentDeliveryStatus.SCHEDULED },
      include: { document: { select: { name: true, code: true } }, customer: { select: { fullName: true, phone: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async cancelScheduled(deliveryId: string) {
    const d = await this.prisma.documentDelivery.findUnique({ where: { id: deliveryId } });
    if (!d) throw new NotFoundException();
    if (d.status !== DocumentDeliveryStatus.SCHEDULED) {
      throw new NotFoundException('Ese envío ya no está programado.');
    }
    return this.prisma.documentDelivery.delete({ where: { id: deliveryId } });
  }
}

@Controller('documents')
class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  // Servir un archivo subido. SIN auth: nombre = hash impredecible (capability url),
  // y así WhatsApp puede descargarlo para enviarlo.
  @Get('file/:name')
  serveFile(@Param('name') name: string, @Res() res: Response) {
    const safe = name.replace(/[^a-zA-Z0-9._-]/g, '');
    return res.sendFile(join(UPLOADS_DIR, safe), (err: any) => {
      if (err) res.status(404).send('not found');
    });
  }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  upload(@Body() dto: UploadDocumentDto) { return this.svc.saveUpload(dto); }

  @Get() @UseGuards(AuthGuard('jwt')) findAll() { return this.svc.findAll(); }

  // Etiquetas de clientes con conteo (para los filtros del modal de envío).
  @Get('customer-tags') @UseGuards(AuthGuard('jwt')) customerTags() { return this.svc.customerTags(); }

  // Envíos programados pendientes.
  @Get('scheduled') @UseGuards(AuthGuard('jwt')) scheduled() { return this.svc.scheduledList(); }
  @Delete('scheduled/:id') @UseGuards(AuthGuard('jwt')) cancelScheduled(@Param('id') id: string) { return this.svc.cancelScheduled(id); }

  @Get(':id') @UseGuards(AuthGuard('jwt')) findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @UseGuards(AuthGuard('jwt')) create(@Body() dto: CreateDocumentDto) { return this.svc.create(dto); }

  // Enviar/programar un documento a uno o varios clientes.
  @Post(':id/send') @UseGuards(AuthGuard('jwt'))
  send(@Param('id') id: string, @Body() dto: SendDocumentDto) { return this.svc.sendToCustomers(id, dto); }

  @Patch(':id') @UseGuards(AuthGuard('jwt')) update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) { return this.svc.update(id, dto); }
  @Delete(':id') @UseGuards(AuthGuard('jwt')) remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ imports: [WhatsappBridgeModule], controllers: [DocumentsController], providers: [DocumentsService] })
export class DocumentsModule {}
