import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationsService } from './conversations.service';
import { WhatsappBridgeService } from '../whatsapp-bridge/whatsapp-bridge.service';

class SendMessageDto {
  @IsString() body: string;
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
  ) {}

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
    return this.bridge.sendText(convo.remoteJid, dto.body);
  }
}
