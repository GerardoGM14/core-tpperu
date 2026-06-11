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
  chatType?: string;     // individual | group | community
  chatName?: string;     // nombre del grupo
  senderName?: string;   // en grupos: autor del mensaje
  reactionToId?: string; // si es reacción: externalId del mensaje al que apunta
  fromMe?: boolean;      // true si lo enviaste tú (desde el teléfono u otro dispositivo)
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
      include: {
        customer: true,
        _count: { select: { messages: true } },
        // último mensaje para el preview de la bandeja
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
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
    // Reacción: en vez de crear un mensaje, la adjuntamos al mensaje original.
    if (evt.kind === 'REACTION' && evt.reactionToId) {
      const target = await this.prisma.message.findUnique({
        where: { externalId: evt.reactionToId },
        include: { conversation: true },
      });
      if (target) {
        const updated = await this.prisma.message.update({
          where: { id: target.id },
          data: { reaction: evt.body || null }, // body vacío = se quitó la reacción
        });
        // Devolvemos la conversación + el mensaje actualizado para refrescar la UI.
        return { conversation: target.conversation, message: updated };
      }
      // Si no encontramos el mensaje objetivo, ignoramos la reacción (no la guardamos como mensaje).
      return { conversation: null as any, message: null as any };
    }

    // Deduplicación: si ya guardamos este mensaje (p.ej. lo enviaste desde el
    // panel y WhatsApp nos lo devuelve como propio), no lo duplicamos.
    if (evt.externalId) {
      const existing = await this.prisma.message.findUnique({
        where: { externalId: evt.externalId },
        include: { conversation: true },
      });
      if (existing) {
        return { conversation: existing.conversation, message: existing };
      }
    }

    const fromMe = !!evt.fromMe;

    let convo = await this.prisma.conversation.findUnique({
      where: { remoteJid: evt.remoteJid },
    });
    const isGroup = evt.chatType === 'group' || evt.chatType === 'community';
    // Para grupos, el nombre que mostramos es el del grupo; para individuales, el pushName.
    const convoName = isGroup ? (evt.chatName || undefined) : evt.pushName;

    if (!convo) {
      convo = await this.prisma.conversation.create({
        data: {
          remoteJid: evt.remoteJid,
          displayName: convoName,
          chatType: evt.chatType || 'individual',
          // Lo que envías tú no cuenta como "sin leer".
          unreadCount: fromMe ? 0 : 1,
          lastMessageAt: new Date(evt.timestamp),
        },
      });
    } else {
      convo = await this.prisma.conversation.update({
        where: { id: convo.id },
        data: {
          ...(fromMe ? {} : { unreadCount: { increment: 1 } }),
          lastMessageAt: new Date(evt.timestamp),
          displayName: convoName ?? convo.displayName,
          chatType: evt.chatType || convo.chatType,
        },
      });
    }

    // El daemon entrega rutas tipo "/media/xxx"; las exponemos vía la API
    // como "/api/whatsapp/media/xxx" para que el frontend las consuma.
    const mediaUrl = evt.mediaUrl
      ? evt.mediaUrl.replace(/^\/media\//, '/api/whatsapp/media/')
      : null;

    const msg = await this.prisma.message.create({
      data: {
        conversationId: convo.id,
        externalId: evt.externalId,
        direction: fromMe ? MessageDirection.OUTBOUND : MessageDirection.INBOUND,
        kind: evt.kind,
        status: fromMe ? MessageStatus.SENT : MessageStatus.DELIVERED,
        body: evt.body ?? null,
        senderName: evt.senderName ?? null,
        mediaUrl,
        mediaMimeType: evt.mediaMimeType ?? null,
        payload: evt.payload ?? undefined,
        ...(fromMe
          ? { sentAt: new Date(evt.timestamp) }
          : { deliveredAt: new Date(evt.timestamp) }),
      },
    });

    return { conversation: convo, message: msg };
  }

  /**
   * Persiste un mensaje saliente ya aceptado por el wa-daemon.
   * El timestamp del daemon viene en segundos Unix.
   */
  async recordOutbound(
    conversationId: string,
    body: string,
    result: { id?: string; timestamp?: number },
  ) {
    const sentAt = result?.timestamp ? new Date(result.timestamp * 1000) : new Date();
    const [msg] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          externalId: result?.id ?? null,
          direction: MessageDirection.OUTBOUND,
          kind: MessageKind.TEXT,
          status: MessageStatus.SENT,
          body,
          sentAt,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: sentAt },
      }),
    ]);
    return msg;
  }

  /** Persiste un mensaje de media saliente. El frontend ya tiene el archivo,
   *  pero para el historial guardamos kind + caption (la media saliente no la
   *  re-servimos; se ve en el momento del envío). */
  async recordOutboundMedia(
    conversationId: string,
    media: { mime: string; caption?: string; filename?: string },
    result: { id?: string; timestamp?: number },
  ) {
    const sentAt = result?.timestamp ? new Date(result.timestamp * 1000) : new Date();
    const kind = media.mime.startsWith('image') ? MessageKind.IMAGE
      : media.mime.startsWith('video') ? MessageKind.VIDEO
      : media.mime.startsWith('audio') ? MessageKind.AUDIO
      : MessageKind.DOCUMENT;
    const [msg] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          externalId: result?.id ?? null,
          direction: MessageDirection.OUTBOUND,
          kind,
          status: MessageStatus.SENT,
          body: media.caption ?? null,
          mediaCaption: media.caption ?? null,
          mediaMimeType: media.mime,
          sentAt,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: sentAt },
      }),
    ]);
    return msg;
  }

  async markRead(conversationId: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });
  }
}
