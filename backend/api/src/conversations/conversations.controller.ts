import { Body, Controller, Get, Logger, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { createHash } from 'crypto';
import { ConversationsService } from './conversations.service';
import { ConversationsGateway } from './conversations.gateway';
import { WhatsappBridgeService } from '../whatsapp-bridge/whatsapp-bridge.service';
import { PrismaService } from '../shared/prisma.service';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'documents');

// Extensión por mime, para cuando el archivo llega sin nombre (audio grabado
// en el navegador, imagen pegada del portapapeles...).
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'application/pdf': '.pdf',
};
function extFromMime(mime: string): string {
  return MIME_EXT[mime] || '';
}

class SendMessageDto {
  @IsString() body: string;
}

class SendDocumentDto {
  @IsString() documentId: string;
  @IsOptional() @IsString() caption?: string;
}

class SendMediaDto {
  @IsString() data: string;        // base64
  @IsString() mime: string;        // image/jpeg, video/mp4, application/pdf...
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsString() filename?: string;
}

class ListMessagesQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  take?: number;
}

@Controller('conversations')
@UseGuards(AuthGuard('jwt'))
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(
    private readonly svc: ConversationsService,
    private readonly bridge: WhatsappBridgeService,
    private readonly gateway: ConversationsGateway,
    private readonly prisma: PrismaService,
  ) {}

  // QR vigente por HTTP — fallback si el socket pierde el evento en tiempo real.
  @Get('whatsapp/qr')
  currentQr() {
    return this.gateway.getCurrentQr() ?? { qr: null };
  }

  @Get() findAll() { return this.svc.findAll(); }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Get(':id/messages')
  listMessages(@Param('id') id: string, @Query() q: ListMessagesQuery) {
    return this.svc.listMessages(id, q.take ?? 50);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string) { return this.svc.markRead(id); }

  @Post(':id/messages')
  async send(@Param('id') id: string, @Body() dto: SendMessageDto) {
    const convo = await this.svc.findOne(id);
    const result = await this.bridge.sendText(convo.remoteJid, dto.body);
    const message = await this.svc.recordOutbound(id, dto.body, result as { id?: string; timestamp?: number });
    // Notificar a todos los paneles abiertos (incluido el que envió)
    this.gateway.server.emit('message', { conversation: { ...convo, lastMessageAt: message.sentAt }, message });
    return message;
  }

  @Post(':id/media')
  async sendMedia(@Param('id') id: string, @Body() dto: SendMediaDto) {
    const convo = await this.svc.findOne(id);
    const result = await this.bridge.sendMedia(convo.remoteJid, dto.data, dto.mime, dto.caption, dto.filename);
    // Guardamos una copia del adjunto para poder mostrarlo luego en el
    // historial; si falla, el mensaje igual se registra (sin previsualización).
    const url = await this.persistOutgoingMedia(dto.data, dto.mime, dto.filename);
    const message = await this.svc.recordOutboundMedia(
      id,
      { ...dto, url },
      result as { id?: string; timestamp?: number },
    );
    this.gateway.server.emit('message', { conversation: { ...convo, lastMessageAt: message.sentAt }, message });
    return message;
  }

  /**
   * Guarda en disco un adjunto enviado desde el panel y devuelve su URL
   * servible. Reutiliza la carpeta de documentos y el nombrado por hash, así
   * que reenviar el mismo archivo no ocupa espacio de más.
   * Devuelve null si no se pudo guardar: el envío ya ocurrió y no debe fallar
   * por no poder previsualizarlo después.
   */
  private async persistOutgoingMedia(
    dataB64: string,
    mime: string,
    filename?: string,
  ): Promise<string | null> {
    try {
      const buffer = Buffer.from(dataB64, 'base64');
      await mkdir(UPLOADS_DIR, { recursive: true });
      const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 24);
      const ext = (filename?.match(/\.[a-z0-9]+$/i)?.[0] || extFromMime(mime)).toLowerCase();
      const name = hash + ext;
      await writeFile(join(UPLOADS_DIR, name), buffer);
      return `/api/documents/file/${name}`;
    } catch (err) {
      this.logger.warn(`No se pudo guardar el adjunto saliente: ${(err as Error).message}`);
      return null;
    }
  }

  // Envía un documento de la biblioteca a la conversación por WhatsApp.
  @Post(':id/send-document')
  async sendDocument(@Param('id') id: string, @Body() dto: SendDocumentDto) {
    const convo = await this.svc.findOne(id);
    const doc = await this.prisma.document.findUnique({ where: { id: dto.documentId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    // El archivo debe ser uno subido (/api/documents/file/<name>).
    const m = doc.fileUrl.match(/\/api\/documents\/file\/(.+)$/);
    if (!m) {
      throw new NotFoundException('El documento no tiene un archivo subido. Edítalo y sube el archivo.');
    }
    const fileName = basename(m[1]);
    const buffer = await readFile(join(UPLOADS_DIR, fileName));
    const dataB64 = buffer.toString('base64');
    const mime = doc.mimeType || 'application/pdf';

    const result = await this.bridge.sendMedia(convo.remoteJid, dataB64, mime, dto.caption, doc.name);
    const message = await this.svc.recordOutboundMedia(
      id,
      { mime, caption: dto.caption, filename: doc.name, url: doc.fileUrl },
      result as { id?: string; timestamp?: number },
    );
    // contar el envío en el documento
    await this.prisma.document.update({ where: { id: doc.id }, data: { sentCount: { increment: 1 } } });
    this.gateway.server.emit('message', { conversation: { ...convo, lastMessageAt: message.sentAt }, message });
    return message;
  }
}
