# Deploy en VPS Linux

Esta guía asume **Ubuntu 22.04 LTS** o **Debian 12**, recursos mínimos **2 vCPU / 4 GB RAM / 40 GB SSD** (mejor 8 GB).

Vas a desplegar:

- **Postgres 16** (nativo, no Docker — más simple para producción pequeña)
- **Redis 7**
- **backend/api** (NestJS) gestionado por **systemd**
- **backend/wa-daemon** (Go) gestionado por **systemd**
- **Nginx** como reverse proxy con TLS de Let's Encrypt

> El frontend y la landing van a Firebase Hosting, no a la VPS.

---

## 1. Preparación inicial del servidor

```bash
# como root o con sudo
apt update && apt upgrade -y
apt install -y curl git build-essential ufw fail2ban

# usuario no-root para deploy
adduser tpp
usermod -aG sudo tpp

# firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

A partir de aquí trabaja como `tpp` (`su - tpp`).

## 2. Postgres 16

```bash
sudo apt install -y postgresql postgresql-contrib

sudo -u postgres psql <<EOF
CREATE USER tpp WITH PASSWORD 'CAMBIA_ESTO_POR_PASSWORD_FUERTE';
CREATE DATABASE tpp OWNER tpp;
GRANT ALL PRIVILEGES ON DATABASE tpp TO tpp;
EOF
```

Postgres queda escuchando solo en `localhost:5432`. Eso es lo correcto.

## 3. Redis 7

```bash
sudo apt install -y redis-server

# editar /etc/redis/redis.conf:
#   bind 127.0.0.1 ::1
#   requirepass <PASSWORD_FUERTE>     (opcional pero recomendado)
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

## 4. Node.js 20 LTS (para la API)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v   # v20.x
```

## 5. Go 1.22 (para wa-daemon)

```bash
cd /tmp
curl -LO https://go.dev/dl/go1.22.10.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.22.10.linux-amd64.tar.gz

# añadir a ~/.bashrc:
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
go version
```

## 6. Clonar el repo

```bash
cd ~
git clone https://github.com/<tu-usuario>/app-tpp-automatizacion.git
cd app-tpp-automatizacion
```

## 7. Configurar y compilar la API

```bash
cd ~/app-tpp-automatizacion/backend/api
cp .env.example .env
nano .env
```

Edita `.env` con valores de producción:

```
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://app.tppperu.com,https://tppperu.com
DATABASE_URL=postgresql://tpp:PASSWORD@localhost:5432/tpp?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=PASSWORD_REDIS
JWT_ACCESS_SECRET=<64+ bytes hex>
JWT_REFRESH_SECRET=<64+ bytes hex distinto>
WA_DAEMON_URL=http://localhost:8080
```

Genera los secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Instala, migra y compila:

```bash
npm ci
npx prisma migrate deploy
npm run build
```

## 8. Configurar y compilar el wa-daemon

```bash
cd ~/app-tpp-automatizacion/backend/wa-daemon
cp .env.example .env
nano .env
```

```
PORT=8080
DATABASE_URL=postgres://tpp:PASSWORD@localhost:5432/tpp?sslmode=disable
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=PASSWORD_REDIS
SESSION_LABEL=default
```

Compila:

```bash
go mod download
go build -o wa-daemon
```

## 9. systemd · servicio para la API

`/etc/systemd/system/tpp-api.service`:

```ini
[Unit]
Description=TPP API (NestJS)
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=tpp
WorkingDirectory=/home/tpp/app-tpp-automatizacion/backend/api
EnvironmentFile=/home/tpp/app-tpp-automatizacion/backend/api/.env
ExecStart=/home/tpp/.nvm/versions/node/v20.18.0/bin/node dist/main.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

> Ajusta la ruta de `node` con `which node`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tpp-api
sudo systemctl status tpp-api
journalctl -u tpp-api -f       # ver logs en vivo
```

## 10. systemd · servicio para wa-daemon

`/etc/systemd/system/tpp-wa.service`:

```ini
[Unit]
Description=TPP WhatsApp Bridge (whatsmeow)
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=tpp
WorkingDirectory=/home/tpp/app-tpp-automatizacion/backend/wa-daemon
EnvironmentFile=/home/tpp/app-tpp-automatizacion/backend/wa-daemon/.env
ExecStart=/home/tpp/app-tpp-automatizacion/backend/wa-daemon/wa-daemon
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tpp-wa
sudo systemctl status tpp-wa
```

## 11. Nginx + Let's Encrypt

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/tpp-api`:

```nginx
server {
    listen 80;
    server_name api.tppperu.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tpp-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# TLS automático
sudo certbot --nginx -d api.tppperu.com
```

> El `wa-daemon` **no** se expone a internet. Solo escucha en `localhost:8080` y la API NestJS habla con él internamente.

## 12. DNS

En tu proveedor de DNS apunta:

- `api.tppperu.com` → IP de la VPS (registro A)
- `app.tppperu.com` → Firebase Hosting (cuando lo configures)
- `tppperu.com` y `www` → Firebase Hosting (landing Astro)

## 13. Vincular WhatsApp por primera vez

1. Abre el frontend (`https://app.tppperu.com`)
2. Login
3. Llamar `POST /api/whatsapp/connect`
4. El frontend recibirá un evento `qr` por WebSocket — renderízalo como QR
5. Escanea con tu celular (WhatsApp → Dispositivos vinculados)
6. El daemon emite evento `status: connected` y persiste credenciales en Postgres
7. Reinicios futuros reconectan automáticamente sin volver a escanear

## 14. Backups

```bash
# Backup diario de Postgres
sudo crontab -e
# añadir:
0 3 * * * /usr/bin/pg_dump -U postgres tpp | gzip > /var/backups/tpp_$(date +\%Y\%m\%d).sql.gz
```

Considera también copiar `/var/backups/` a un bucket S3/B2 con `rclone` o `restic`.

## 15. Updates futuros

```bash
cd ~/app-tpp-automatizacion
git pull

# API
cd backend/api
npm ci
npx prisma migrate deploy
npm run build
sudo systemctl restart tpp-api

# wa-daemon
cd ../wa-daemon
go build -o wa-daemon
sudo systemctl restart tpp-wa
```

---

## Checklist final

- [ ] Postgres y Redis arrancan en boot (`systemctl is-enabled postgresql redis-server`)
- [ ] `tpp-api` y `tpp-wa` arrancan en boot
- [ ] `curl https://api.tppperu.com/health` responde `{"status":"ok"}`
- [ ] CORS permite tu dominio de Firebase
- [ ] Cookies refresh funcionan cross-domain (`SameSite=None; Secure`)
- [ ] Backup diario automático
- [ ] `ufw status` permite solo 22, 80, 443
