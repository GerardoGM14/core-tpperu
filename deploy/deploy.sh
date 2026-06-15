#!/usr/bin/env bash
# ============================================================
# TPP Perú · Script de despliegue al VPS
# Uso (desde tu PC, en la raíz del repo):
#   bash deploy/deploy.sh
#
# Recompila frontend/landing localmente, sube el código y
# reconstruye los contenedores en el VPS. Idempotente.
# ============================================================
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@161.132.37.31}"
VPS_KEY="${VPS_KEY:-$HOME/.ssh/tpp_vps}"
VPS_DIR="/opt/tpp"
SSH="ssh -i $VPS_KEY -o BatchMode=yes $VPS_HOST"

echo "==> 1/4 Build local de frontend (base /app) y landing (same-origin)"
( cd frontend && MSYS_NO_PATHCONV=1 VITE_API_URL="" npx vite build --base=/app/ )
( cd landing  && MSYS_NO_PATHCONV=1 PUBLIC_API_URL="" npx astro build )

echo "==> 2/4 Preparar estáticos en deploy/www"
rm -rf deploy/www
mkdir -p deploy/www/frontend deploy/www/landing
cp -r frontend/dist/* deploy/www/frontend/
cp -r landing/dist/*  deploy/www/landing/

echo "==> 3/4 Subir al VPS ($VPS_DIR)"
tar czf - \
  --exclude='node_modules' --exclude='.git' \
  --exclude='backend/api/dist' --exclude='frontend/dist' \
  --exclude='frontend/node_modules' --exclude='landing/dist' \
  --exclude='landing/node_modules' --exclude='*.log' \
  backend/api backend/wa-daemon deploy docker-compose.prod.yml .env.prod \
  | $SSH "mkdir -p $VPS_DIR && tar xzf - -C $VPS_DIR"

echo "==> 4/4 Rebuild + restart en el VPS"
$SSH "cd $VPS_DIR && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"

echo "==> Estado final:"
$SSH "cd $VPS_DIR && docker compose -f docker-compose.prod.yml ps"
echo "==> Listo. App en http://161.132.37.31  ·  Panel en http://161.132.37.31/app"
