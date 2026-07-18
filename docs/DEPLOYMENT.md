# Deployment Guide

This guide covers how to deploy Xuvilo on a standard Linux server or a managed Node.js platform. It assumes you have already read `DEVELOPER_HANDOFF.md` and have the source code, secrets, and a database backup.

---

## Architecture overview

Xuvilo runs as two Node.js processes behind a reverse proxy:

```
Internet → Reverse Proxy (nginx / Caddy / platform router)
              ├── / → Web app process  (port 24130)
              └── /api → API server process  (port 8080)
```

The web app serves the built React bundle and handles SSR for SEO. The API server handles all data operations. Both read from the same PostgreSQL database.

---

## Option A: VPS / Bare Metal (nginx + pm2)

### 1. Server setup

```bash
# On Ubuntu 22.04+
apt-get update
apt-get install -y nodejs npm nginx poppler-utils tesseract-ocr postgresql-client

# Install pnpm
npm install -g pnpm

# Install pm2 (process manager)
npm install -g pm2
```

Install Node.js 24 via nvm if your distro doesn't have it:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 24
nvm use 24
```

### 2. Clone and build

```bash
git clone <your-repo-url> /opt/xuvilo
cd /opt/xuvilo

pnpm install --frozen-lockfile
pnpm run build
```

### 3. Environment variables

Create `/opt/xuvilo/.env.production`:
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
AUTH_SIGNING_SECRET=...
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@xuvilo.com
PUBLIC_APP_URL=https://xuvilo.com
TURNSTILE_SECRET_KEY=...
CONTACT_TEAM_EMAIL=hello@xuvilo.com
```

### 4. Database setup

```bash
# Restore from backup (if migrating)
pg_restore --no-owner --no-acl --dbname="$DATABASE_URL" backup.dump

# Apply current schema (safe to run on existing data)
DATABASE_URL="..." pnpm --filter @workspace/db push
```

### 5. Start with pm2

```bash
# Create pm2 ecosystem file
cat > /opt/xuvilo/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: "xuvilo-web",
      script: "artifacts/businesses-hub/dist/server.mjs",
      env: {
        NODE_ENV: "production",
        PORT: "24130",
      },
      env_file: ".env.production",
    },
    {
      name: "xuvilo-api",
      script: "node",
      args: "--enable-source-maps artifacts/api-server/dist/index.mjs",
      env: {
        NODE_ENV: "production",
        PORT: "8080",
      },
      env_file: ".env.production",
    },
  ],
};
EOF

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed instructions to auto-start on reboot
```

### 6. nginx configuration

```nginx
# /etc/nginx/sites-available/xuvilo
server {
    listen 80;
    server_name xuvilo.com www.xuvilo.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name xuvilo.com;

    # SSL (use certbot: certbot --nginx -d xuvilo.com)
    ssl_certificate     /etc/letsencrypt/live/xuvilo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xuvilo.com/privkey.pem;

    # API server
    location /api {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 15m;  # must match API server's body limit (12mb + overhead)
    }

    # Web app (everything else)
    location / {
        proxy_pass http://127.0.0.1:24130;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect www → apex
server {
    listen 443 ssl http2;
    server_name www.xuvilo.com;
    ssl_certificate     /etc/letsencrypt/live/xuvilo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xuvilo.com/privkey.pem;
    return 301 https://xuvilo.com$request_uri;
}
```

```bash
ln -s /etc/nginx/sites-available/xuvilo /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7. SSL certificate

```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d xuvilo.com -d www.xuvilo.com
```

---

## Option B: Railway

Railway auto-detects Node.js and handles process management.

1. Push the repo to GitHub.
2. Create a new Railway project → "Deploy from GitHub repo".
3. Create **two services** (one per artifact):
   - Service 1 (Web): Start command: `node artifacts/businesses-hub/dist/server.mjs`; Build: `pnpm install && pnpm run build`
   - Service 2 (API): Start command: `node --enable-source-maps artifacts/api-server/dist/index.mjs`; Build: same
4. Add a **PostgreSQL** plugin.
5. Set all environment variables in each service's Variables tab.
6. Add a custom domain and set `PUBLIC_APP_URL`.
7. Set `PORT` — Railway injects `$PORT` automatically, but verify it matches what each service uses.
8. Install system packages by adding a `Dockerfile` or `nixpacks.toml`:

```toml
# nixpacks.toml (Railway reads this automatically)
[phases.setup]
aptPkgs = ["poppler-utils", "tesseract-ocr"]
```

---

## Option C: Render

1. Connect your GitHub repo.
2. Create two **Web Services** (one per artifact).
3. Add a **PostgreSQL** database.
4. Set build command: `pnpm install --frozen-lockfile && pnpm run build`
5. Set start commands per service.
6. Set all environment variables.
7. Add system packages in your `render.yaml`:

```yaml
# render.yaml
services:
  - type: web
    name: xuvilo-web
    env: node
    buildCommand: pnpm install --frozen-lockfile && pnpm run build
    startCommand: node artifacts/businesses-hub/dist/server.mjs
    envVars:
      - key: PORT
        value: 10000
      - key: NODE_ENV
        value: production
      # ... other vars
```

---

## Option D: Fly.io

Fly.io uses Docker. Create a `Dockerfile`:

```dockerfile
FROM node:24-slim

RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build

# Start API server (deploy web app separately or use fly.toml processes)
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
```

```toml
# fly.toml
[build]

[[services]]
  internal_port = 8080
  protocol = "tcp"
  [[services.ports]]
    handlers = ["http"]
    port = 80
  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

---

## Updating the application

```bash
cd /opt/xuvilo

# Pull latest code
git pull

# Install new dependencies
pnpm install --frozen-lockfile

# Apply any schema changes
DATABASE_URL="..." pnpm --filter @workspace/db push

# Rebuild
pnpm run build

# Restart processes (zero-downtime with pm2)
pm2 reload xuvilo-web xuvilo-api
```

---

## Health checks

The API server exposes a health endpoint at `GET /api/healthz`. Use this in your process manager, load balancer, or uptime monitor.

```bash
curl https://xuvilo.com/api/healthz
# Expected: 200 OK
```

---

## Monitoring

The API server uses Pino for structured JSON logging. Pipe logs to your log aggregator:

```bash
pm2 logs xuvilo-api --raw | pino-pretty   # human-readable in dev
pm2 logs xuvilo-api --raw | your-log-shipper   # production
```

---

## Scheduled database backups (recommended)

Add a cron job on your server:

```bash
# /etc/cron.d/xuvilo-backup
0 3 * * * root /usr/bin/pg_dump "$DATABASE_URL" --no-owner --no-acl \
  --format=custom \
  --file=/backups/xuvilo_$(date +\%Y\%m\%d).dump \
  && find /backups -name "xuvilo_*.dump" -mtime +30 -delete
```

Store backups off-site (S3, Backblaze B2, Google Drive).
