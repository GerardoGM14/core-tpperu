# wa-daemon · WhatsApp bridge (Go + whatsmeow)

Daemon HTTP que envuelve [whatsmeow](https://github.com/tulir/whatsmeow) y se comunica con la API NestJS por:

- **HTTP** (entrante: `/connect`, `/disconnect`, `/status`, `/send`)
- **Redis pub/sub** (saliente: emite QR, status y mensajes recibidos)

## Endpoints

| Método | Path | Descripción |
|---|---|---|
| GET | `/health` | Healthcheck |
| GET | `/status` | `{ connected, jid, pushName }` |
| POST | `/connect` | Inicia sesión. Si no hay sesión persistida, emite QR por Redis |
| POST | `/disconnect` | Cierra sesión |
| POST | `/send` | Body: `{ remoteJid, body }` envía mensaje de texto |

## Canales Redis (publica)

- `whatsapp:qr` → `{ "qr": "..." }`
- `whatsapp:status` → `{ "status": "connected" \| "disconnected" \| "qr" \| "qr-timeout" \| "logged-out", "jid", "pushName", "reason" }`
- `whatsapp:inbound` → `InboundEvent` (mensaje recibido)

## Setup local

Requisitos: **Go 1.22+**, Postgres y Redis corriendo (ver `docker-compose.yml` raíz).

```bash
cd backend/wa-daemon
cp .env.example .env

go mod download
go run .
```

El primer arranque crea automáticamente las tablas `whatsmeow_*` en Postgres.

## Cómo se persiste la sesión

`whatsmeow` usa `sqlstore` apuntado a la misma Postgres que la API. Después de escanear el QR una vez, las credenciales quedan guardadas; reinicios futuros reconectan sin pedir QR de nuevo.

## Build de producción

```bash
go build -o wa-daemon
./wa-daemon
```

Compila a un binario estático (~15 MB), ideal para systemd en la VPS.
