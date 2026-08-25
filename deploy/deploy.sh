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

echo "==> 1/6 Build local de frontend (base /app) y landing (same-origin)"
( cd frontend && MSYS_NO_PATHCONV=1 VITE_API_URL="" npx vite build --base=/app/ )
( cd landing  && MSYS_NO_PATHCONV=1 PUBLIC_API_URL="" npx astro build )

echo "==> 2/6 Preparar estáticos en deploy/www"
rm -rf deploy/www
mkdir -p deploy/www/frontend deploy/www/landing
cp -r frontend/dist/* deploy/www/frontend/
cp -r landing/dist/*  deploy/www/landing/

echo "==> 3/6 Subir al VPS ($VPS_DIR)"
tar czf - \
  --exclude='node_modules' --exclude='.git' \
  --exclude='backend/api/dist' --exclude='frontend/dist' \
  --exclude='frontend/node_modules' --exclude='landing/dist' \
  --exclude='landing/node_modules' --exclude='*.log' \
  backend/api backend/wa-daemon deploy docker-compose.prod.yml .env.prod \
  | $SSH "mkdir -p $VPS_DIR && tar xzf - -C $VPS_DIR"

echo "==> 4/6 Rebuild + restart en el VPS"
$SSH "cd $VPS_DIR && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build"

# Al recrear api/wa-daemon, Docker les asigna una IP interna nueva; nginx
# (que no se recrea) cachea la vieja y responde 502. Reiniciarlo lo obliga
# a re-resolver.
echo "==> 5/6 Reiniciar nginx (re-resolver IP del API)"
$SSH "cd $VPS_DIR && docker compose -f docker-compose.prod.yml --env-file .env.prod restart nginx"

# La API tarda en levantar (NestJS + prisma migrate deploy).
echo "==> 6/6 Verificar salud"
$SSH '
  for i in $(seq 1 12); do
    if curl -sf http://localhost/health >/dev/null; then
      echo "Salud OK (intento $i)"; exit 0;
    fi
    echo "Esperando a la API... (intento $i)"; sleep 5;
  done
  echo "La API no respondio a /health tras 60s"; exit 1
'

echo "==> Estado final:"
$SSH "cd $VPS_DIR && docker compose -f docker-compose.prod.yml ps"
echo "==> Listo. App en http://161.132.37.31  ·  Panel en http://161.132.37.31/app"
