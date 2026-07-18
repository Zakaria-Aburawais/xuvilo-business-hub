# Deployment Guide — Xuvilo Business Hub

---

## Current production setup

| Item | Value |
|---|---|
| Platform | Replit Deployments |
| Primary domain | xuvilo.com |
| www redirect | www.xuvilo.com → xuvilo.com (301, server.ts ~line 2436) |
| SSL | Handled automatically by Replit |
| Database | Replit PostgreSQL (provisioned in the Repl) |
| Object storage | Replit Object Storage |
| Email | SendGrid (via Replit integration) |

---

## Deploying on Replit (standard flow)

1. Make your changes in the Replit workspace
2. Verify: `pnpm run typecheck` must pass with no errors
3. If you changed the DB schema, run the schema push against production:
   ```bash
   pnpm --filter @workspace/db run push
   ```
4. Click **Deploy** in the Replit header (or use the Deployments panel)
5. Replit builds both services (`businesses-hub` and `api-server`), health-checks them, and swaps traffic — zero-downtime

> The production build uses the same `DATABASE_URL` as development in Replit. Be careful — schema pushes and data changes in the workspace affect the live database.

---

## Custom domain (already configured)

The domain `xuvilo.com` is linked in Replit Deployments → Custom Domains. DNS is managed externally (the domain registrar points its nameservers or A/CNAME records at Replit).

To add another domain:
1. Go to Deployments → Custom Domains in the Replit UI
2. Add the domain and follow the DNS verification steps

---

## Known infrastructure quirk

Replit's edge layer adds `:443` to HTTP→HTTPS redirect `Location` headers (e.g. `Location: https://xuvilo.com:443/`). This happens at the Replit infrastructure level, before traffic reaches the Express server. Modern browsers and Googlebot handle it correctly, but some SEO audit tools flag it. It cannot be fixed in application code.

---

## Deploying outside Replit

If you want to self-host or move to another platform (Railway, Fly.io, Render, AWS, etc.):

### Services to run

| Service | Start command | Port var |
|---|---|---|
| Web app | `pnpm --filter @workspace/businesses-hub run dev` (dev) or build + serve dist | `PORT` |
| API server | `pnpm --filter @workspace/api-server run start` (after build) | `PORT` |

### Reverse proxy requirements

You need a reverse proxy (nginx, Caddy, etc.) that:
- Routes `/api/*` → API server
- Routes everything else → Web app

The web app's SSR server (`server.ts`) handles its own routing internally. The API server handles `/api/*` routes.

Example nginx config (simplified):
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Building for production

```bash
# Build the web app
pnpm --filter @workspace/businesses-hub run build
# Serve the dist folder with the SSR server:
PORT=3000 BASE_PATH=/ node artifacts/businesses-hub/dist/server.js

# Build the API server
pnpm --filter @workspace/api-server run build
# Start the API server:
PORT=8001 node artifacts/api-server/dist/index.mjs
```

### Object storage outside Replit

The API server uses `@google-cloud/storage` via Replit's Object Storage abstraction. Outside Replit, you'll need to swap the storage client:

- Replace `lib/objectStorage` (or wherever storage is initialized) with an S3/GCS/R2 client
- Set the appropriate credentials in environment variables
- The storage is used for RFQ PDF uploads — without it, the RFQ Intelligence module won't work

### Replit Connectors outside Replit

The SendGrid integration and GitHub integration use Replit's connector proxy (`connectors.replit.com`). Outside Replit, these connectors don't work. Set `SENDGRID_API_KEY` directly in your environment instead.

---

## Checking production health

### Via curl

```bash
# API health check
curl https://xuvilo.com/api/healthz

# Check the web app SSR (should return full HTML)
curl -s https://xuvilo.com/ | grep "<title>"

# Check a blog article SSR
curl -s https://xuvilo.com/blog/vat-calculator-uae | grep '<h1'
```

### Production logs (Replit)

1. Open the Replit Deployments panel
2. Click **Logs** to view real-time production logs for both services
3. Logs are structured JSON (via pino) — filter by level: `"level":50` = error, `"level":40` = warn

---

## Rollback

On Replit: the Deployments panel shows deployment history. Click any previous deployment and select **Rollback**.

On other platforms: re-deploy the previous Docker image / build artifact / git commit.

> **Database caveat:** Rollbacks do not revert database schema changes. If a schema push added columns, rolling back the code to a version that doesn't know about those columns is safe (extra columns are ignored). If a schema push dropped columns, rolling back the code will break queries that expected those columns — restore from backup.

---

## Environment variables in production

In Replit Deployments, secrets are managed in the Repl's Secrets panel (padlock icon). They are automatically available to both the web app and API server.

If you move off Replit, set all variables from `.env.example` in your hosting platform's secret/environment management system. **Do not commit `.env` to git.**

---

## First deploy on a fresh database

```bash
# 1. Set DATABASE_URL to your new PostgreSQL instance
# 2. Push the schema
DATABASE_URL=postgresql://... pnpm --filter @workspace/db run push

# 3. (Optional) Create an admin user via the API or directly in the DB:
#    INSERT INTO app_users (id, email, name, password_hash, role)
#    VALUES (gen_random_uuid(), 'admin@example.com', 'Admin', '<bcrypt-hash>', 'admin');

# 4. Deploy the services
```
