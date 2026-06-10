package wa

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"go.mau.fi/whatsmeow"
	waLog "go.mau.fi/whatsmeow/util/log"

	"github.com/tppperu/wa-daemon/internal/bus"
)

type Config struct {
	DatabaseURL string
	Publisher   bus.Publisher
}

// Client envuelve whatsmeow con métodos cómodos para nuestros handlers HTTP.
// La lógica de eventos (mensajes, QR, status) se conecta en setupEventHandlers.
type Client struct {
	cfg       Config
	wa        *whatsmeow.Client
	mu        sync.Mutex
	connected bool
	logger    waLog.Logger
}

func New(ctx context.Context, cfg Config) (*Client, error) {
	if cfg.Publisher == nil {
		return nil, errors.New("publisher is required")
	}

	c := &Client{
		cfg:    cfg,
		logger: waLog.Stdout("wa", "INFO", true),
	}

	// La inicialización real del whatsmeow.Client se hace en Connect(),
	// porque whatsmeow requiere abrir el sqlstore con contexto.
	return c, nil
}

func (c *Client) Connect(ctx context.Context) (qr string, err error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.connected {
		return "", nil
	}

	// Si quedó un cliente previo a medias (QR expirado, intento anterior),
	// lo desconectamos y descartamos para arrancar el emparejamiento limpio.
	if c.wa != nil {
		c.wa.Disconnect()
		c.wa = nil
	}

	wac, err := openClient(ctx, c.cfg.DatabaseURL, c.logger)
	if err != nil {
		return "", fmt.Errorf("open client: %w", err)
	}
	c.wa = wac
	c.setupEventHandlers()

	if wac.Store.ID == nil {
		// Sin sesión: hay que escanear QR.
		// Usamos un contexto de fondo propio (no el de la request HTTP),
		// porque el canal de QR vive más que la petición /connect.
		bgCtx := context.Background()
		qrChan, _ := wac.GetQRChannel(bgCtx)
		if err := wac.Connect(); err != nil {
			return "", fmt.Errorf("connect: %w", err)
		}
		_ = c.cfg.Publisher.PublishStatus(bgCtx, bus.StatusEvent{Status: "qr"})

		go c.handleQR(bgCtx, qrChan)
		return "qr-pending", nil
	}

	// Ya emparejado: reconecta directo
	if err := wac.Connect(); err != nil {
		return "", fmt.Errorf("connect: %w", err)
	}
	c.connected = true
	_ = c.cfg.Publisher.PublishStatus(ctx, bus.StatusEvent{
		Status:   "connected",
		JID:      wac.Store.ID.String(),
		PushName: wac.Store.PushName,
	})
	return "", nil
}

func (c *Client) Disconnect(ctx context.Context) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.wa != nil {
		c.wa.Disconnect()
	}
	c.connected = false
	_ = c.cfg.Publisher.PublishStatus(ctx, bus.StatusEvent{Status: "disconnected"})
}

func (c *Client) Status() Status {
	c.mu.Lock()
	defer c.mu.Unlock()

	st := Status{Connected: c.connected}
	if c.wa != nil && c.wa.Store.ID != nil {
		st.JID = c.wa.Store.ID.String()
		st.PushName = c.wa.Store.PushName
	}
	return st
}

func (c *Client) SendText(ctx context.Context, remoteJID, body string) (SendResult, error) {
	c.mu.Lock()
	wac := c.wa
	c.mu.Unlock()

	if wac == nil || !wac.IsConnected() {
		return SendResult{}, errors.New("not connected")
	}

	jid, err := parseJID(remoteJID)
	if err != nil {
		return SendResult{}, err
	}

	resp, err := wac.SendMessage(ctx, jid, buildTextMessage(body))
	if err != nil {
		return SendResult{}, err
	}
	return SendResult{
		ID:        resp.ID,
		Timestamp: resp.Timestamp.Unix(),
	}, nil
}

// SendMedia sube un archivo a WhatsApp y lo envía al destinatario.
func (c *Client) SendMedia(ctx context.Context, remoteJID string, data []byte, mime, caption, filename string) (SendResult, error) {
	c.mu.Lock()
	wac := c.wa
	c.mu.Unlock()

	if wac == nil || !wac.IsConnected() {
		return SendResult{}, errors.New("not connected")
	}

	jid, err := parseJID(remoteJID)
	if err != nil {
		return SendResult{}, err
	}

	msg, err := c.uploadOutgoing(ctx, data, mime, caption, filename)
	if err != nil {
		return SendResult{}, err
	}

	resp, err := wac.SendMessage(ctx, jid, msg)
	if err != nil {
		return SendResult{}, err
	}
	return SendResult{ID: resp.ID, Timestamp: resp.Timestamp.Unix()}, nil
}

func (c *Client) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.wa != nil {
		c.wa.Disconnect()
	}
}

func (c *Client) handleQR(ctx context.Context, qrChan <-chan whatsmeow.QRChannelItem) {
	for evt := range qrChan {
		switch evt.Event {
		case "code":
			log.Printf("QR code generado (len=%d), publicando en Redis", len(evt.Code))
			if err := c.cfg.Publisher.PublishQR(ctx, evt.Code); err != nil {
				log.Printf("publish qr: %v", err)
			}
		case "success":
			c.mu.Lock()
			c.connected = true
			jid := ""
			pushName := ""
			if c.wa != nil && c.wa.Store.ID != nil {
				jid = c.wa.Store.ID.String()
				pushName = c.wa.Store.PushName
			}
			c.mu.Unlock()
			_ = c.cfg.Publisher.PublishStatus(ctx, bus.StatusEvent{
				Status:   "connected",
				JID:      jid,
				PushName: pushName,
			})
			return
		case "timeout":
			_ = c.cfg.Publisher.PublishStatus(ctx, bus.StatusEvent{
				Status: "qr-timeout",
				Reason: "QR no escaneado a tiempo",
			})
			return
		}
		// Pequeño cushion para evitar publicar QR demasiado rápido
		time.Sleep(50 * time.Millisecond)
	}
}

type Status struct {
	Connected bool   `json:"connected"`
	JID       string `json:"jid,omitempty"`
	PushName  string `json:"pushName,omitempty"`
}

type SendResult struct {
	ID        string `json:"id"`
	Timestamp int64  `json:"timestamp"`
}
