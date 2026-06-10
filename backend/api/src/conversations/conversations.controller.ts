import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationsService } from './conversations.service';
import { ConversationsGateway } from './conversations.gateway';
import { WhatsappBridgeService } from '../whatsapp-bridge/whatsapp-bridge.service';

class SendMessageDto {
  @IsString() body: string;
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
  constructor(
    private readonly svc: ConversationsService,
    private readonly bridge: WhatsappBridgeService,
    private readonly gateway: ConversationsGateway,
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
    const message = await this.svc.recordOutboundMedia(id, dto, result as { id?: string; timestamp?: number });
    this.gateway.server.emit('message', { conversation: { ...convo, lastMessageAt: message.sentAt }, message });
    return message;
  }
}
