# Alpha Agent Builder — public copy (cloud / independent server)

This project is meant to run **on a server or PaaS**, not from your laptop. Once deployed, **anyone on the web** can reach it; there is no dependency on your personal machine.

## Railway (managed hosting)

Use the root **`Dockerfile`** and **`railway.toml`**. Step-by-step: **[RAILWAY.md](./RAILWAY.md)** (volume on `/data`, generate public domain).

## Docker Compose (your own server)

Requires [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2.

```bash
cd alpha_agent_builder_public
docker compose up --build -d
```

- **App URL:** [http://localhost:8080](http://localhost:8080) (nginx serves the UI and proxies `/api` to the API container).
- **Persistence:** SQLite, generated agents, and git cache live in the Docker volume **`builder-data`** (mounted at `/data` in the API container). Removing the volume wipes user accounts and projects.

### Environment (optional)

Set on the **`api`** service (compose `environment:` or a `.env` file next to `docker-compose.yml`):

| Variable | Purpose |
|----------|---------|
| `ALPHA_APP_DATA_DIR` | Data directory (default `/data` in the image). |
| `CORS_ORIGINS` | Comma-separated list if you expose the API on a **different** hostname than the SPA (advanced). |

### HTTPS and a real domain

Compose exposes plain HTTP on port **8080**. For production, put **Caddy**, **Traefik**, **Cloudflare**, or a cloud load balancer in front with TLS, and map host `443` → `web:80`.

## What runs where

| Container | Role |
|-----------|------|
| **`web`** | nginx + built React app (`VITE_API_BASE` empty → browser calls `/api` on the same host). |
| **`api`** | FastAPI + SQLite + agent generation on volume `/data`. |

No laptop tunnel (ngrok, etc.) is involved in this setup.

## Local development (optional)

If you still want hot reload on your machine:

```bash
./start_public_web.sh
```

That script is **not** required for the cloud deployment above.

## Split hosting (static site + API)

If you host the SPA and API on different domains, build the frontend with:

```bash
cd frontend
VITE_API_BASE=https://your-api.example.com npm run build
```

Deploy the `dist/` folder to a static host and run **only** `Dockerfile.api` (or equivalent), with `CORS_ORIGINS` including your static site origin. See `PUBLIC_ACCESS_GUIDE.md` for provider ideas.

## Security notes

- This demo app runs **user-generated code** on the server that hosts the API. Treat that as **untrusted execution** before opening to strangers at scale; add isolation (containers per user, queues, limits) for production.
- Rotate secrets; use strong platform firewalls and backups for `/data`.
- Embedded **Run agent** iframes still use **127.0.0.1** URLs on the **API host**; remote visitors may not see those previews the same way you do on localhost. Core flows (signup, generate, edit, check-in) work over normal HTTP.
