# Deploy on Railway

This folder is ready as **one Railway service**: Docker builds the React app, copies it into the image, and **FastAPI** serves both `/api/*` and the static SPA. The process listens on **`PORT`** (Railway sets this automatically).

## 1. Create the project

**Option A — GitHub (recommended)**

1. Push `alpha_agent_builder_public` to a GitHub repo (this directory can be the repo root, or use a monorepo).
2. In [Railway](https://railway.com) → **New Project** → **Deploy from GitHub** → pick the repo.

**Option B — CLI**

```bash
cd alpha_agent_builder_public
npm i -g @railway/cli   # if needed
railway login
railway init
railway up
```

## 2. Set the root directory (monorepos)

If the GitHub repo contains more than this app, open the service → **Settings** → **Root Directory** → set to the path of `alpha_agent_builder_public` (e.g. `agents/2_openai/alpha_agent_builder_public`).

Railway will use `railway.toml` and the **`Dockerfile`** in that directory.

## 3. Persistent data (required)

SQLite and generated agents live under **`ALPHA_APP_DATA_DIR`** (default **`/data`** in the image).

1. In the Railway service → **Settings** → **Volumes**.
2. **Add volume** → mount path: **`/data`**.
3. Redeploy if prompted.

Without a volume, **users and agents are lost** on every deploy.

## 4. Environment variables

| Variable | When to set |
|----------|-------------|
| **`PUBLIC_BASE_URL`** | **Required on Railway** if you use **React** agents and click **Run**. Set to your public app URL with **no trailing slash**, e.g. `https://alpha-agent-builder-public-production.up.railway.app`. The app proxies generated Vite + agent API traffic through this host. |
| `ALPHA_APP_DATA_DIR` | Only if you change the volume mount path from `/data`. |
| `CORS_ORIGINS` | Only if you split frontend and API onto different public URLs. |
| `CORS_ORIGIN_REGEX` | Override default tunnel regex; set empty to disable regex matching. |

No need to set `PORT` — Railway provides it.

## 5. Generate a public URL

Service → **Settings** → **Networking** → **Generate domain** (e.g. `*.up.railway.app`).

Open that URL: you should get the builder UI; `https://…/health` should return `{"status":"ok"}`.

## 6. Local Docker (sanity check)

Same image as Railway:

```bash
docker build -t alpha-public .
docker run --rm -p 8080:8080 -e PORT=8080 -v alpha-data:/data alpha-public
```

Then open `http://localhost:8080`.

## Notes

- **Docker Compose** (`docker-compose.yml`) is for self‑hosted multi-container setups; **Railway uses the root `Dockerfile`** only.
- **Costs / abuse**: this app can run arbitrary generated code on the server; add rate limits and monitoring before a wide public launch.
