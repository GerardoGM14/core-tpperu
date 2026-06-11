package wa

import (
	"context"
	"log"

	"go.mau.fi/whatsmeow/types/events"

	"github.com/tppperu/wa-daemon/internal/bus"
)

// setupEventHandlers conecta los eventos de whatsmeow con el publisher Redis.
// Sólo manejamos los eventos relevantes para nuestro dominio (mensajes,
// conexión, desconexión). El resto los ignoramos.
func (c *Client) setupEventHandlers() {
	c.wa.AddEventHandler(func(evt any) {
		ctx := context.Background()

		switch e := evt.(type) {
		case *events.Message:
			c.onMessage(ctx, e)

		case *events.Connected:
			c.mu.Lock()
			c.connected = true
			jid := ""
			pushName := ""
			if c.wa.Store.ID != nil {
				jid = c.wa.Store.ID.String()
				pushName = c.wa.Store.PushName
			}
			c.mu.Unlock()
			_ = c.cfg.Publisher.PublishStatus(ctx, bus.StatusEvent{
				Status:   "connected",
				JID:      jid,
				PushName: pushName,
			})

		case *events.Disconnected:
			c.mu.Lock()
			c.connected = false
			c.mu.Unlock()
			_ = c.cfg.Publisher.PublishStatus(ctx, bus.StatusEvent{
				Status: "disconnected",
			})

		case *events.LoggedOut:
			c.mu.Lock()
			c.connected = false
			c.mu.Unlock()
			_ = c.cfg.Publisher.PublishStatus(ctx, bus.StatusEvent{
				Status: "logged-out",
				Reason: e.Reason.String(),
			})
		}
	})
}

func (c *Client) onMessage(ctx context.Context, e *events.Message) {
	// Procesamos también los mensajes propios (IsFromMe): son los que envías
	// desde el teléfono u otro dispositivo. La API evita duplicar por externalId.

	// Aceptamos chats individuales y grupos. Ignoramos estados (@broadcast)
	// y canales/newsletters (@newsletter), que no son conversaciones.
	chat := e.Info.Chat
	if chat.Server == "broadcast" || chat.Server == "newsletter" {
		return
	}

	// Tipo de chat y nombre del autor (relevante en grupos).
	chatType := "individual"
	chatName := ""
	senderJID := ""
	senderName := ""
	if e.Info.IsGroup {
		chatType = "group"
		senderJID = e.Info.Sender.ToNonAD().String()
		senderName = e.Info.PushName // nombre que muestra quien escribió
		// Nombre del grupo (best-effort; si falla, el frontend usa el JID)
		if info, err := c.wa.GetGroupInfo(ctx, chat); err == nil && info != nil {
			chatName = info.GroupName.Name
			if info.IsParent {
				chatType = "community"
			}
		}
	}

	kind, body, _, _ := extractContent(e)

	// Reacción: capturar a qué mensaje apunta (el body lleva el emoji).
	reactionToID := ""
	if kind == "REACTION" {
		if rm := unwrap(e.Message).GetReactionMessage(); rm != nil {
			reactionToID = rm.GetKey().GetID()
		}
	}

	// Si trae media, la descargamos/desciframos y guardamos en disco.
	// mediaURL pasa a ser una ruta servible: /media/<archivo>.
	mediaURL := ""
	mediaMime := ""
	if kind == "IMAGE" || kind == "VIDEO" || kind == "AUDIO" || kind == "DOCUMENT" || kind == "STICKER" {
		if name, mime := c.downloadIncoming(ctx, e); name != "" {
			mediaURL = "/media/" + name
			mediaMime = mime
		}
	}

	// JID normalizado: solo usuario + servidor (sin :device), p.ej.
	// "51987654321@s.whatsapp.net". Así la conversación es estable.
	cleanJID := chat.ToNonAD().String()

	evt := bus.InboundEvent{
		RemoteJID:     cleanJID,
		PushName:      e.Info.PushName,
		ExternalID:    e.Info.ID,
		Kind:          kind,
		Body:          body,
		MediaURL:      mediaURL,
		MediaMimeType: mediaMime,
		Timestamp:     e.Info.Timestamp.UnixMilli(),
		ChatType:      chatType,
		ChatName:      chatName,
		SenderJID:     senderJID,
		SenderName:    senderName,
		ReactionToID:  reactionToID,
		FromMe:        e.Info.IsFromMe,
	}

	if err := c.cfg.Publisher.PublishInbound(ctx, evt); err != nil {
		log.Printf("publish inbound: %v", err)
	}
}
