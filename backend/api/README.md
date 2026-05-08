# TPP API · NestJS

Backend principal de TPP Perú. Maneja autenticación, lógica de negocio (clientes, paquetes, ventas, conversaciones, flujos, campañas, recordatorios, documentos, plantillas) y orquesta el `wa-daemon` (Go + whatsmeow).

## Stack

- **NestJS 10** + TypeScript
- **Prisma** (ORM) + **PostgreSQL 16**
- **Redis 7** (cache + BullMQ + pub/sub con wa-daemon)
- **Socket.IO** (`/conversations` namespace) para WhatsApp en tiempo real
- **JWT** (access en header `Authorization: Bearer`, refresh en cookie `httpOnly`)

## Setup local

Requiere **Postgres + Redis** corriendo. Lo más fácil es subirlos con Docker desde la raíz del repo:

```bash
# desde la raíz del monorepo
docker compose up -d
```

Luego:

```bash
cd backend/api
cp .env.example .env
# editar .env si necesitas

npm install
npx prisma migrate dev --name init   # crea las tablas
npm run start:dev                     # http://localhost:4000
```

## Endpoints principales

| Método | Path | Descripción |
|---|---|---|
| GET | `/health` | Healthcheck (postgres, redis) |
| POST | `/api/auth/register` | Crear usuario |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Usuario actual |
| CRUD | `/api/customers` | Clientes |
| CRUD | `/api/packages` | Paquetes turísticos |
| CRUD | `/api/orders` | Ventas/reservas |
| CRUD | `/api/templates` | Plantillas WSP |
| CRUD | `/api/documents` | Documentos del viaje |
| CRUD | `/api/campaigns` | Campañas |
| CRUD | `/api/reminders` | Recordatorios |
| CRUD | `/api/flows` | Flujos automatizados |
| GET | `/api/conversations` | Lista de conversaciones |
| GET | `/api/conversations/:id/messages` | Historial |
| POST | `/api/conversations/:id/messages` | Enviar mensaje (vía wa-daemon) |
| POST | `/api/conversations/:id/read` | Marcar leído |
| POST | `/api/whatsapp/connect` | Iniciar sesión WSP (emite QR por WS) |
| POST | `/api/whatsapp/disconnect` | Cerrar sesión |
| GET | `/api/whatsapp/status` | Estado del daemon |

## WebSocket

Namespace: `/conversations`

Eventos emitidos al frontend:
- `qr` — código QR (string base64) para vincular WhatsApp
- `status` — `{ status: 'connected' | 'disconnected' | 'connecting' | 'qr' }`
- `message` — `{ conversation, message }` cada vez que llega un mensaje

## Comunicación con wa-daemon

- **Saliente**: `WhatsappBridgeService` hace `POST` a `WA_DAEMON_URL` (default `http://localhost:8080`).
- **Entrante**: el daemon publica en canales Redis (`whatsapp:inbound`, `whatsapp:qr`, `whatsapp:status`); `ConversationsGateway` los consume.

## Migraciones

```bash
npx prisma migrate dev --name <nombre>     # dev
npx prisma migrate deploy                  # producción
npx prisma studio                          # GUI para inspeccionar DB
```
