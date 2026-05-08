# TPP Perú · Plataforma de Gestión

Monorepo del producto interno de TPP Perú. Frontend de operaciones, backend principal y bridge de WhatsApp.

## Estructura

```
app-tpp-automatizacion/
├── frontend/         React + Vite (panel ops, va a Firebase Hosting)
├── landing/          Astro (sitio público — pendiente)
├── backend/
│   ├── api/          NestJS + Prisma (lógica de negocio)
│   └── wa-daemon/    Go + whatsmeow (bridge WhatsApp)
├── docker-compose.yml   Postgres + Redis para dev local
├── DEPLOY.md         Guía paso a paso para VPS Linux
└── README.md
```

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│        Frontend (Firebase Hosting)                  │
│        React + Vite + react-router                  │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / WSS
                      ▼
┌─────────────────────────────────────────────────────┐
│                  VPS Linux                          │
│                                                     │
│   ┌──────────────────┐    ┌──────────────────┐    │
│   │  backend/api     │◄──►│  wa-daemon       │    │
│   │  NestJS          │HTTP│  Go + whatsmeow  │    │
│   │  CRUD + auth     │    │  WhatsApp Web    │    │
│   └────────┬─────────┘    └─────────┬────────┘    │
│            │                         │             │
│            ▼                         ▼             │
│        Postgres ◄──────────────────► Redis        │
│                                  (pub/sub + jobs)  │
└─────────────────────────────────────────────────────┘
```

- **Frontend ↔ API**: HTTP (REST) + WebSocket (Socket.IO en `/conversations`).
- **API ↔ wa-daemon**: HTTP local para acciones (enviar, conectar) + Redis pub/sub para eventos (mensajes recibidos, QR, status).
- **Persistencia**: una sola Postgres compartida. La API usa Prisma, el daemon usa el `sqlstore` propio de whatsmeow (tablas `whatsmeow_*`).

## Setup local

### 1. Servicios de infraestructura

```bash
docker compose up -d   # postgres:5432, redis:6379
```

### 2. Backend API (NestJS)

```bash
cd backend/api
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run start:dev      # http://localhost:4000
```

### 3. wa-daemon (Go)

```bash
cd backend/wa-daemon
cp .env.example .env
go mod download
go run .               # http://localhost:8080
```

### 4. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

## Producción

Ver [`DEPLOY.md`](./DEPLOY.md).

- Frontend → Firebase Hosting
- Landing → Firebase Hosting
- API + wa-daemon + Postgres + Redis → tu VPS Linux

## Licencia

Privada.
