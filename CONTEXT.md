# Contexto del proyecto · TPP Perú · Plataforma de Gestión

> **Para el siguiente chat:** este archivo resume todo lo construido y decidido en la sesión anterior. Léelo antes de tocar código para mantener consistencia. El usuario es **Gerardo González** (`gerardo.gonzalez@sertech.pe`), el proyecto vive en `c:\Users\Soporte\Documents\Extra\app-tpp-automatizacion\`.

---

## 1. Qué es el proyecto

Plataforma operativa interna para **TPP Perú** (agencia de turismo). Maneja:

- Ventas y reservas de paquetes turísticos
- Clientes y CRM básico
- **Bandeja de WhatsApp en tiempo real** (la pieza clave)
- Flujos de automatización tipo node-and-wire (recuperación de carrito, etc.)
- Plantillas de mensajes, recordatorios, campañas
- Documentos del viaje (PDFs, vouchers)
- Editor de landing y catálogo público
- Reportes

---

## 2. Stack y arquitectura final

**Monorepo** con tres pilares + infraestructura compartida:

```
app-tpp-automatizacion/
├── frontend/              React + Vite + react-router-dom (Firebase Hosting)
├── landing/               Astro (Firebase Hosting) — pendiente
├── backend/
│   ├── api/               NestJS + Prisma + PostgreSQL + Redis
│   └── wa-daemon/         Go + whatsmeow + chi
├── docker-compose.yml     Postgres 16 + Redis 7 (dev local)
├── DEPLOY.md              Guía paso a paso para VPS Linux
├── CONTEXT.md             Este archivo
└── README.md
```

### Diagrama

```
┌─────────────────────────────────────────────────────┐
│        Frontend (Firebase Hosting)                  │
│        React + Vite + react-router-dom              │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / WSS
                      ▼
┌─────────────────────────────────────────────────────┐
│                  VPS Linux (futuro)                 │
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

### Comunicación entre piezas

- **Frontend ↔ API**: HTTP REST (`/api/*`) + WebSocket Socket.IO en namespace `/conversations`
- **API ↔ wa-daemon**: HTTP local del daemon (`POST /connect`, `/send`, etc.) **+** Redis pub/sub para eventos entrantes (mensajes recibidos, QR, status)
- **Persistencia**: una sola Postgres compartida. La API usa **Prisma**; el daemon usa el **`sqlstore` propio de whatsmeow** (tablas `whatsmeow_*`)

### Decisiones clave (NO cambiar sin discutir)

1. **WhatsApp = whatsmeow** (Go), no Baileys (Node). El usuario tiene un compañero que usa whatsmeow y funciona bien. Beeper (commercial) lo usa en producción → mejor estabilidad que Baileys.
2. **Daemon Go separado del API NestJS** porque whatsmeow es Go-only. NestJS y wa-daemon hablan por HTTP+Redis.
3. **PostgreSQL** (no MySQL/Mongo): JSONB nativo, FTS, relaciones fuertes, transacciones reales.
4. **Redis** doble propósito: BullMQ (jobs) + pub/sub con wa-daemon.
5. **Auth**: JWT access en header + refresh token en cookie httpOnly.
6. **Ambiente del frontend**: Firebase Hosting (panel ops + landing). Backend en VPS Linux administrada por el usuario.
7. **Chi (no Gin/Fiber)** en Go: minimalista.
8. **Vincular WhatsApp por QR** (no Cloud API oficial). El usuario aceptó las implicaciones (riesgo de baneo, no oficial, etc.).

---

## 3. Estado actual del frontend

Ya estaba construido al iniciar la sesión. Trabajo hecho durante la sesión:

### Migración a estructura de monorepo de carpetas
- Antes: archivos `.jsx` sueltos en `frontend/` cargados con CDN + Babel in-browser
- Ahora: Vite 6 + React 18, ES modules, estructura `src/` con carpetas semánticas

### Estructura final de `frontend/src/`
```
src/
├── main.jsx
├── App.jsx                    BrowserRouter, layouts, providers
├── routes.jsx                 ROUTES array central + ROUTE_BY_ID
├── data/travesia.js           Mock data (TRAVESIA_DATA) — TODAVÍA EN USO
├── assets/logo-tppperu.png    Logo blanco del sidebar
├── components/
│   ├── icons.jsx
│   └── TopProgress.jsx        Barra de carga estilo NProgress (2 pasadas, 1000ms)
├── layout/
│   ├── AppLayout.jsx          Outlet + Sidebar + Topbar
│   ├── Sidebar.jsx            Usa NavLink, muestra logo en bloque sb-brand
│   └── Topbar.jsx
├── tweaks/index.jsx           Panel de tweaks (acento, densidad, etc.)
└── features/
    ├── dashboard/Dashboard.jsx
    ├── ventas/Ventas.jsx          Exporta Ventas y Clientes
    ├── conversations/Conversations.jsx   Exporta Conversations y Plantillas
    ├── flows/FlowBuilder.jsx
    ├── landing/LandingEditor.jsx  Exporta LandingEditor, Catalogo, Reportes
    ├── modules/Modules.jsx        Exporta Documentos y Recordatorios
    └── modals/Modals.jsx          Registry de ~20 modales
```

### Archivos en raíz del `frontend/`
- `index.html` — título "TPP Perú · Gestión", `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`
- `public/favicon.svg` — cuadrado terracotta con "T"
- `styles.css` — design system completo (paleta cálida, Geist + Geist Mono, ~800 líneas). Incluye estilos de `.topprogress` añadidos al final.
- `vite.config.js` — port 3000, react plugin
- `package.json` — react, react-dom, **react-router-dom** (instalado durante la sesión)

### Puntos importantes del frontend
- **Sidebar muestra una imagen** (`logo-tppperu.png`), reemplazó al cuadrado "T" + texto. Está blanco sobre fondo oscuro del sidebar. Altura `36px`.
- **Existe el bloque "TPP Perú · producción"** abajo del logo (selector de ambiente con dot verde). NO se reemplaza por imagen, queda como texto.
- **TopProgress** se monta dentro de `<BrowserRouter>` y reacciona a `useLocation`. Hace 2 pasadas de 0→100% en 1000ms total. Sin glow externo (el usuario lo pidió quitar).
- **Sidebar usa `<NavLink>`** de react-router. Se añadió `text-decoration: none` a `.sb-item` en CSS.
- **TODAVÍA NO ESTÁ CONECTADO AL BACKEND.** Las vistas siguen leyendo `TRAVESIA_DATA` mock.

---

## 4. Estado actual del backend `api/` (NestJS)

### Stack
- NestJS 10 + TypeScript
- Prisma 5.22 + PostgreSQL 16
- Redis 7 (BullMQ + pub/sub)
- Socket.IO en namespace `/conversations`
- JWT (`@nestjs/jwt`) + refresh tokens en cookie httpOnly
- argon2 para hashing de passwords

### Estructura
```
backend/api/
├── prisma/
│   ├── schema.prisma          17 modelos completos
│   └── migrations/
│       └── 20260508171959_init/
├── src/
│   ├── main.ts                CORS, cookieParser, validation pipe global
│   ├── app.module.ts          Importa todos los módulos
│   ├── shared/
│   │   ├── prisma.service.ts
│   │   ├── redis.service.ts   Cliente principal + factory de subscribers (createSubscriber)
│   │   └── shared.module.ts   Global
│   ├── common/health.controller.ts   /health verifica postgres+redis
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts    Register, login, refresh, logout. argon2 + crypto.
│   │   ├── auth.controller.ts /api/auth/{register,login,refresh,logout,me}
│   │   ├── auth.dto.ts        LoginDto, RegisterDto
│   │   ├── jwt.strategy.ts    Bearer header
│   │   └── current-user.decorator.ts
│   ├── users/                 CRUD básico
│   ├── customers/             CRUD completo con DTOs separados
│   ├── catalog/               Paquetes turísticos (todo en module.ts)
│   ├── orders/                Ventas/reservas
│   ├── conversations/
│   │   ├── conversations.controller.ts
│   │   ├── conversations.service.ts   Tiene ingestInbound() para wa-daemon
│   │   ├── conversations.gateway.ts   ⭐ Socket.IO + suscripción Redis
│   │   └── conversations.module.ts
│   ├── flows/, campaigns/, reminders/, documents/, templates/   CRUD básico
│   ├── whatsapp-bridge/
│   │   ├── whatsapp-bridge.service.ts   Cliente HTTP del wa-daemon
│   │   ├── whatsapp-bridge.controller.ts
│   │   └── whatsapp-bridge.module.ts
│   └── queues/queues.module.ts   BullMQ con 3 colas: reminders, campaigns, outbound-messages
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env                       (gitignored, generado durante la sesión)
└── .env.example
```

### Modelos Prisma (17)
User, RefreshToken, Package, Customer, Order, Payment, Conversation, Message, Flow, FlowNode, FlowEdge, FlowRun, Template, Campaign, Reminder, Document, WhatsappSession.

Todos los enums están definidos: UserRole, PackageStatus, OrderStatus, OrderChannel, ConversationStatus, MessageDirection, MessageStatus, MessageKind, FlowStatus, FlowTriggerType, FlowNodeType, FlowRunStatus, TemplateStatus, CampaignStatus, ReminderStatus, DocumentKind.

### Detalle importante: Redis + ioredis
- **`RedisService.client`** → conexión normal para comandos.
- **`RedisService.createSubscriber()`** → crea conexiones nuevas en modo subscriber. NO se reutiliza una sola para subscribe + comandos (causa el error "Connection in subscriber mode, only subscriber commands may be used"). El `ConversationsGateway` ya usa `createSubscriber()`.

### Endpoints validados durante la sesión
- ✅ `POST /api/auth/register` — registró al usuario `gerardo.gonzalez@sertech.pe` (password: `tpp_test_2026`, rol: AGENT)
- ✅ `POST /api/auth/login` — emite JWT
- ✅ `GET /api/auth/me` con `Authorization: Bearer <token>`
- ✅ `POST /api/customers` — creó "Maria Lopez" `+51987654321`
- ✅ `GET /api/customers`
- ✅ `GET /health` — `{api, postgres, redis: ok}`

---

## 5. Estado actual del backend `wa-daemon/` (Go)

### Stack
- Go 1.22
- `go.mau.fi/whatsmeow` (versión `v0.0.0-20241016121023-f6e60c1d3f5b`)
- `github.com/go-chi/chi/v5`
- `github.com/redis/go-redis/v9`
- `github.com/joho/godotenv`

### Estructura
```
backend/wa-daemon/
├── main.go              Bootstrap HTTP, graceful shutdown
├── go.mod
├── .env / .env.example
└── internal/
    ├── bus/bus.go       Publisher Redis + tipos InboundEvent, StatusEvent
    ├── wa/
    │   ├── client.go    Wrapper de whatsmeow (Connect, Disconnect, Status, SendText)
    │   ├── store.go     Abre sqlstore Postgres
    │   ├── events.go    setupEventHandlers (Message, Connected, Disconnected, LoggedOut)
    │   └── messages.go  parseJID, buildTextMessage, extractContent (TEXT, IMAGE, AUDIO, etc.)
    └── handlers/handlers.go   /health, /status, /connect, /disconnect, /send
```

### NO HA SIDO COMPILADO NI EJECUTADO TODAVÍA EN LA SESIÓN
El siguiente paso era arrancarlo:
1. `cd backend/wa-daemon`
2. `cp .env.example .env`
3. `go mod download`
4. `go run .`

**Posibles problemas a vigilar al arrancar Go**:
- La versión de `whatsmeow` podría haber cambiado de API (es un proyecto vivo). Si `go mod download` baja una versión más nueva, los nombres de tipos/eventos pueden haber cambiado.
- El `sqlstore.New("postgres", dbURL, logger)` puede requerir importar el driver `github.com/lib/pq` con `_ "github.com/lib/pq"` — Go-Postgres a veces necesita el driver registrado side-effect. Si falla con "unknown driver postgres", agregar el import.
- Las tablas `whatsmeow_*` se crean automáticamente al primer arranque.

### Canales Redis pub/sub usados
- `whatsapp:qr` — `{ "qr": "..." }`
- `whatsapp:status` — `{ status, jid?, pushName?, reason? }`
- `whatsapp:inbound` — `InboundEvent` (mensaje recibido completo)

---

## 6. Estado de Docker / infraestructura local

```bash
docker compose up -d   # ya ejecutado durante la sesión
```

Contenedores corriendo:
- `tpp-dev-postgres-1` — postgres:16-alpine, puerto 5432
- `tpp-dev-redis-1` — redis:7-alpine, puerto 6379

**Volúmenes persistentes** (sobreviven a `down`):
- `tpp-dev_tpp_postgres_data`
- `tpp-dev_tpp_redis_data`

**Para verificar estado**:
```bash
docker compose ps
docker exec tpp-dev-postgres-1 pg_isready -U tpp -d tpp
docker exec tpp-dev-redis-1 redis-cli ping
```

**Datos en la DB** (al final de la sesión):
- 1 usuario: `gerardo.gonzalez@sertech.pe` (rol AGENT)
- 1 cliente: "Maria Lopez" `+51987654321`
- 17 tablas vacías + `_prisma_migrations` con 1 migración aplicada (`20260508171959_init`)

---

## 7. Datos sensibles del entorno

Los `.env` están **gitignored**. En el reinicio del próximo chat:
- Si Postgres y Redis siguen vivos en Docker, `.env` ya tiene los secrets generados — no regenerar.
- Si se hizo `docker compose down -v` (con `-v`), hay que correr de nuevo `npx prisma migrate dev --name init`.

**JWT secrets** generados con `crypto.randomBytes(64).toString('hex')`. Están en `backend/api/.env`.

---

## 8. Lo que sigue (próximos pasos)

### Inmediato (próxima sesión)
1. **Arrancar wa-daemon Go** — `cd backend/wa-daemon && go mod download && go run .`
   - Verificar que escuche en `localhost:8080` y se conecte a Redis sin error
   - `curl http://localhost:8080/health` → `{"status":"ok"}`
2. **Probar `POST /api/whatsapp/connect`** desde el API NestJS — debería emitir QR por Redis y verse en logs

### Conexión frontend ↔ backend (Fase 1)
Crear capa de cliente API en el frontend:
- `frontend/src/api/client.js` — fetch wrapper con `baseURL` desde `import.meta.env.VITE_API_URL`, auth header automático, refresh de token, errores normalizados
- `frontend/src/api/socket.js` — Socket.IO al namespace `/conversations`
- `frontend/src/auth/AuthContext.jsx` — guarda access token en memoria
- Páginas `/login`, `/register`
- `.env.development` — `VITE_API_URL=http://localhost:4000`
- `.env.production` — `VITE_API_URL=https://api.tppperu.com`
- Guard de rutas: si no auth → `/login`

**Decisión pendiente**:
- **TanStack Query** vs `useState + useEffect` plano. Recomendación de claude: TanStack Query.
- **Login UI**: minimalista funcional o bonita con design system. Recomendación: minimalista primero.

### Conexión por dominio (Fase 2)
Un archivo por recurso en `src/api/`: `customers.js`, `packages.js`, `orders.js`, etc.

### Migración por vista (Fase 3, en orden)
1. **Conversaciones** — primero porque valida HTTP + WebSocket + WhatsApp end-to-end
2. **Clientes** — CRUD básico, prueba el patrón
3. **Catálogo / paquetes**
4. **Ventas / órdenes**
5. **Plantillas**, **Documentos**
6. **Dashboard** — endpoint nuevo `/api/dashboard/stats`
7. **Flujos** — más complejo, dejar al final
8. **Recordatorios y Campañas**

### Landing Astro (Fase 4)
- En `landing/` — Astro fresco
- Lee paquetes públicos de `GET /api/public/packages` (endpoint nuevo, sin auth, solo `ACTIVE`)
- Form de contacto crea Customer + Conversation + dispara WSP de bienvenida
- El usuario ya tiene `landing/src/styles/global.css` empezado (lo abrió en el IDE)

---

## 9. Reglas de colaboración aprendidas

- **Idioma**: el usuario prefiere español. Responde siempre en español.
- **Estilo**: "yo confío ciegamente en ti" — pero igual confirma decisiones grandes antes de tirar 30 archivos.
- **Tono**: directo, sin endulzar. Cuando hay riesgos (e.g. WhatsApp QR no oficial), decirle claro.
- **No autoejecutar destructivo**: no `docker compose down -v`, no `git push`, no force.
- **Commits**: el usuario maneja git, no commits sin pedir.
- **Memoria persistente** ya guardada bajo `~/.claude/projects/c--Users-Soporte-Documents-Extra-app-tpp-automatizacion/memory/`.

---

## 10. Cómo levantar todo en local (TL;DR para el próximo chat)

```bash
# 1. Postgres + Redis
cd c:\Users\Soporte\Documents\Extra\app-tpp-automatizacion
docker compose up -d

# 2. API NestJS
cd backend/api
npm run start:dev          # http://localhost:4000

# 3. wa-daemon Go (cuando se arranque por primera vez)
cd ../wa-daemon
cp .env.example .env       # solo la primera vez
go mod download            # solo la primera vez
go run .                   # http://localhost:8080

# 4. Frontend
cd ../../frontend
npm run dev                # http://localhost:3000
```

**Login para probar API**:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gerardo.gonzalez@sertech.pe","password":"tpp_test_2026"}'
```

---

## 11. Archivos importantes a leer en el próximo chat (en orden)

1. `CONTEXT.md` ← este
2. `README.md` — visión general
3. `DEPLOY.md` — solo cuando vayan a desplegar
4. `backend/api/prisma/schema.prisma` — modelo de datos
5. `backend/api/src/app.module.ts` — qué módulos hay
6. `backend/api/src/conversations/conversations.gateway.ts` — patrón del bridge WSP
7. `backend/wa-daemon/main.go` — entry point del daemon
8. `frontend/src/App.jsx` y `frontend/src/routes.jsx` — entry point del frontend
9. `frontend/src/data/travesia.js` — la mock data que hay que reemplazar por API real

---

_Última actualización: 2026-05-08, fin de sesión. Backend NestJS funcional y validado vía curl. wa-daemon escrito pero no compilado todavía. Frontend independiente, todavía consumiendo mock data._
