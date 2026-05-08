package bus

import (
	"context"
	"encoding/json"

	"github.com/redis/go-redis/v9"
)

type Channels struct {
	Inbound string
	QR      string
	Status  string
}

type Publisher interface {
	PublishInbound(ctx context.Context, evt InboundEvent) error
	PublishQR(ctx context.Context, qr string) error
	PublishStatus(ctx context.Context, status StatusEvent) error
	Close() error
}

type InboundEvent struct {
	RemoteJID     string         `json:"remoteJid"`
	PushName      string         `json:"pushName,omitempty"`
	ExternalID    string         `json:"externalId"`
	Kind          string         `json:"kind"`
	Body          string         `json:"body,omitempty"`
	MediaURL      string         `json:"mediaUrl,omitempty"`
	MediaMimeType string         `json:"mediaMimeType,omitempty"`
	Payload       map[string]any `json:"payload,omitempty"`
	Timestamp     int64          `json:"timestamp"`
}

type StatusEvent struct {
	Status   string `json:"status"`
	JID      string `json:"jid,omitempty"`
	PushName string `json:"pushName,omitempty"`
	Reason   string `json:"reason,omitempty"`
}

type RedisPublisher struct {
	rdb      *redis.Client
	channels Channels
}

func NewRedisPublisher(ctx context.Context, addr, password string, ch Channels) (*RedisPublisher, error) {
	rdb := redis.NewClient(&redis.Options{Addr: addr, Password: password})
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &RedisPublisher{rdb: rdb, channels: ch}, nil
}

func (p *RedisPublisher) PublishInbound(ctx context.Context, evt InboundEvent) error {
	return p.publish(ctx, p.channels.Inbound, evt)
}

func (p *RedisPublisher) PublishQR(ctx context.Context, qr string) error {
	return p.publish(ctx, p.channels.QR, map[string]string{"qr": qr})
}

func (p *RedisPublisher) PublishStatus(ctx context.Context, evt StatusEvent) error {
	return p.publish(ctx, p.channels.Status, evt)
}

func (p *RedisPublisher) publish(ctx context.Context, channel string, payload any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return p.rdb.Publish(ctx, channel, b).Err()
}

func (p *RedisPublisher) Close() error {
	return p.rdb.Close()
}
