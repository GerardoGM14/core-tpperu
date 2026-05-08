import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageDirection, MessageKind, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';

export interface InboundMessageEvent {
  remoteJid: string;
  pushName?: string;
  externalId: string;
  kind: MessageKind;
  body?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  payload?: Prisma.JsonValue;
  timestamp: number;
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  findAll() {
    return this.prisma.conversation.findMany({
      include: { customer: true, _count: { select: { messages: true } } },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.conversation.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!c) throw new NotFoundException();
    return c;
  }

  listMessages(conversationId: string, take = 50) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /**
   * Persiste un mensaje entrante recibido desde wa-daemon.
   * Crea la conversación si no existe.
   */
  async ingestInbound(evt: InboundMessageEvent) {
    let convo = await this.prisma.conversation.findUnique({
      where: { remoteJid: evt.remoteJid },
    });
    if (!convo) {
      convo = await this.prisma.conversation.create({
        data: {
          remoteJid: evt.remoteJid,
          displayName: evt.pushName,
          unreadCount: 1,
          lastMessageAt: new Date(evt.timestamp),
        },
      });
    } else {
      convo = await this.prisma.conversation.update({
        where: { id: convo.id },
        data: {
          unreadCount: { increment: 1 },
          lastMessageAt: new Date(evt.timestamp),
          displayName: evt.pushName ?? convo.displayName,
        },
      });
    }

    const msg = await this.prisma.message.create({
      data: {
        conversationId: convo.id,
        externalId: evt.externalId,
        direction: MessageDirection.INBOUND,
        kind: evt.kind,
        status: MessageStatus.DELIVERED,
        body: evt.body ?? null,
        mediaUrl: evt.mediaUrl ?? null,
        mediaMimeType: evt.mediaMimeType ?? null,
        payload: evt.payload ?? undefined,
        deliveredAt: new Date(evt.timestamp),
      },
    });

    return { conversation: convo, message: msg };
  }

  async markRead(conversationId: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });
  }
}
