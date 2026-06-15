# ============================================================
# TPP API (NestJS) - build multi-stage
# ============================================================
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Prisma necesita openssl
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Quitar devDependencies para la imagen final
RUN npm prune --omit=dev

# ------------------------------------------------------------
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl wget && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 4000

# Aplica migraciones y arranca
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
