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
	// Ignorar mensajes salientes propios (echo)
	if e.Info.IsFromMe {
		return
	}

	kind, body, mediaURL, mediaMime := extractContent(e)

	evt := bus.InboundEvent{
		RemoteJID:     e.Info.Chat.String(),
		PushName:      e.Info.PushName,
		ExternalID:    e.Info.ID,
		Kind:          kind,
		Body:          body,
		MediaURL:      mediaURL,
		MediaMimeType: mediaMime,
		Timestamp:     e.Info.Timestamp.UnixMilli(),
	}

	if err := c.cfg.Publisher.PublishInbound(ctx, evt); err != nil {
		log.Printf("publish inbound: %v", err)
	}
}
