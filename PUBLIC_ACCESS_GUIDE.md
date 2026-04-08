# Alpha Agent Builder — Giving the public access (and commercializing)

This guide does two things:

1. **Commercialization in plain language** — how strangers can use your app safely, what it costs, and which **new accounts** you typically need.
2. **Technical steps** — including the original **“tunnel from your laptop”** recipe (good for demos, **not** a substitute for real hosting if you charge money).

**Mental model:** Your app is a **React frontend** (Vite) plus a **Python backend** (FastAPI). The public must reach **both** through **HTTPS**, ideally on a **stable URL** that stays up when your computer is off.

---

## Part A — Choose how you want to expose the app

| Path | Best for | Your laptop must stay on? | Rough monthly cost* | New accounts you often need |
|------|----------|-----------------------------|---------------------|-----------------------------|
| **A1. Tunnel from laptop** | Showing the app to a few people; internal testing | **Yes** — if it sleeps, link dies | **$0** (free tiers) or **~$8–25/mo** for fixed URL / fewer limits | Tunnel provider (e.g. ngrok) **or** none for quick Cloudflare tunnels |
| **A2. “Real” hosting (recommended for paying customers)** | Selling access, beta users you don’t know, 24/7 availability | **No** — runs in the cloud | **~$7–50+/mo** for a small MVP (scales up with traffic + AI usage) | Host for **API** (Railway, Render, Fly.io, etc.), host for **frontend** (Vercel, Netlify, Cloudflare Pages), optional **managed DB** |
| **A3. Single VPS (one server)** | You want one box you control (Docker, etc.) | **No** | **~$6–40/mo** (small VM) + domain | Cloud **VPS** (DigitalOcean, Hetzner, AWS Lightsail, Linode), domain registrar |

\*Prices change; treat numbers as **typical starter ranges**, not quotes. Always check each vendor’s current pricing page.

**Rule of thumb:** If you **commercialize** (take payment, promise uptime, or run **untrusted** users’ code on your machine), **do not** rely on “my laptop + tunnel” as the only story — move to **A2** or **A3**.

---

## Part A1 — Laptop + tunnel (quick demo path)

**What this is:** A small program opens a **public HTTPS URL** and forwards traffic to **Vite on port 5173** on your Mac. The UI talks to FastAPI through the **proxy** pattern described in Part B below.

**When to use it:** Demos, friends, short tests. **Not** a business-grade deployment.

**Accounts:**

- **ngrok:** Free account at [ngrok.com](https://ngrok.com) if you use ngrok; add auth token once on your Mac.
- **Cloudflare quick tunnel:** Often **no account** for a temporary `trycloudflare.com` URL; a **named** tunnel may use a free Cloudflare account.

**Costs:**

- **ngrok free:** Random URL each time; visitors may see an interstitial page; session limits apply.
- **ngrok paid:** Often **~$8–10+/mo** (varies) for reserved domains and smoother UX.
- **cloudflared quick tunnel:** Usually **$0** for basic experiments.

**Steps (simple):**

1. Get the app running locally (`./start_alpha_agent_builder.sh` — see Part B §4).
2. Apply the **Vite + `api.ts` changes** in Part B §3 so remote browsers don’t call `127.0.0.1:8000`.
3. Install **ngrok** or **cloudflared** (Part B §2.2).
4. Run the tunnel to **port 5173** (Part B §5).
5. Open the **HTTPS** link in an incognito window and test login; then share **only that HTTPS link**.

**Limits you should tell customers (if any):**

- Link stops if your Mac sleeps or disconnects.
- You are exposing **your computer**; treat the URL like a **temporary demo password**.
- “Open agent UI” links that embed `localhost` may not work for remote visitors without extra tunnels (see Part B §8).

---

## Part A2 — Hosted production (typical path to commercialize)

**What this is:** Frontend and backend run on **someone else’s servers** 24/7 with HTTPS and a **domain** you control (e.g. `app.yourcompany.com`).

**Why it matters for commercialization:** Paying users expect the site to work when your laptop is closed; you also reduce the risk of strangers hitting **your home network** and **your personal machine**.

### Rough architecture

1. **Build** the React app to static files (`npm run build`).
2. **Deploy** those files to a static host (Vercel, Netlify, Cloudflare Pages, etc.).
3. **Deploy** FastAPI as a **web service** (Railway, Render, Fly.io, Google Cloud Run, AWS ECS/Fargate, etc.).
4. Point the frontend to the **public API URL** (environment variable such as `VITE_API_BASE=https://api.yourcompany.com`).
5. Configure **CORS** on FastAPI to allow your **frontend origin** (required when frontend and API are on different domains).

### Accounts you typically create

| Purpose | Examples (pick one per row) |
|--------|-----------------------------|
| Frontend hosting | Vercel, Netlify, Cloudflare Pages |
| Backend / API hosting | Railway, Render, Fly.io, AWS, GCP |
| Domain + DNS | Namecheap, Google Domains successor, Cloudflare Registrar, etc. |
| Email for “password reset” (later) | Resend, SendGrid, Amazon SES |
| Error / uptime monitoring (optional) | Sentry, Better Stack, UptimeRobot |

### Rough costs (starter)

- **Domain:** about **$10–20/year**.
- **Frontend static hosting:** often **$0** on free tiers for low traffic.
- **API host:** commonly **~$5–25/mo** for a small always-on container; **spikes** when users run heavy agents or LLM calls (your **OpenAI or other provider bills** are often larger than hosting).
- **Managed Postgres** (if you outgrow SQLite): **~$5–20/mo** entry level on many providers.

### Steps at a high level

1. **Containerize or use the host’s “Python service” template** for `backend/` (many guides: “FastAPI + Railway/Render”).
2. **Set environment variables** on the host for secrets (API keys, `JWT` secrets, DB URL) — **never** commit `.env`.
3. **Run database migrations** or document how `auth_store` / DB files persist (ephemeral disks lose data on some hosts unless you attach storage or use a managed DB).
4. **Build and deploy** the frontend with `VITE_API_BASE` pointing at your live API.
5. **Turn on HTTPS** (almost always automatic on these hosts).
6. **Smoke-test** signup, login, and one full “generate agent” flow on the **production URL**.

This repo does **not** include Stripe or subscription code today; charging money is a separate integration (next section).

---

## Part A3 — One VPS (Docker / Nginx)

**What this is:** Rent one Linux server; you install Docker (or systemd services), **Nginx** or **Caddy** as reverse proxy, TLS certificates (often **Let’s Encrypt**, **$0**).

**Accounts:** VPS provider + domain DNS pointed at the server’s IP.

**Costs:** **~$6–40/mo** for a modest VM; your time to maintain security updates is the hidden cost.

**When it helps:** You want one bill, full control, or custom networking — common for teams with DevOps comfort.

---

## Charging money (commercialization basics)

The app can use **login/signup** today, but **paid plans** usually need:

| Piece | What it does | Common provider | Accounts / fees |
|-------|----------------|-----------------|-----------------|
| **Payments** | Cards, invoices, trials | **Stripe** (typical) | Stripe account; **~2.9% + $0.30** per successful card charge in many regions (see Stripe pricing) |
| **“Who paid?” mapping** | Link Stripe customer ↔ your user id | Your backend tables or Stripe metadata | Engineering work in **FastAPI** |
| **Customer portal** | Cancel plan, update card | Stripe Customer Portal | Configure in Stripe Dashboard |
| **Legal pages** | Terms of Service, Privacy Policy | Your lawyer or templates + review | Not a vendor account; **get professional advice** if you take money |

You do **not** strictly need Stripe to **sell** (invoices, contracts, manual access) — but for **self-serve** SaaS, Stripe is the usual path.

---

## Security and trust (before you go wide)

- **Secrets:** Keep `.env` off git; rotate keys if exposed.
- **Who can sign up:** Consider **invite-only**, **email allowlists**, or **CAPTCHA** if you fear abuse.
- **Agent execution:** If user-generated agents run code on your server, treat that as **untrusted execution** — isolate (containers, sandboxes, separate workers) before scaling strangers.
- **Rate limits:** Add API throttling per user/IP to reduce cost blowups from bots.

---

## Part B — Original: tunnel from your laptop (detailed setup)

This section is the **technical** companion to **Part A1**. It explains how to let **other people on the internet** open your app in a browser **while the app still runs on your computer**. The pattern is: **HTTPS tunnel → your machine → Vite (frontend) + FastAPI (backend)**.

**What you are not doing here:** You are not deploying to a cloud server. When your laptop sleeps, closes, or loses Wi‑Fi, the public link stops working.

---

### B1. What runs on your machine (quick mental model)

| Piece | Default URL | Role |
|--------|-------------|------|
| **Frontend** (Vite + React) | `http://127.0.0.1:5173` | Web UI in the browser |
| **Backend** (FastAPI) | `http://127.0.0.1:8000` | API, auth, agent generation, runs agents |

Today, the frontend is often configured to call the API at **`http://127.0.0.1:8000`**. That address means **“this computer”** from the **browser’s** point of view.

- On **your** laptop: that is correct.
- On **someone else’s** laptop: `127.0.0.1` is **their** machine, not yours — so **login and API calls will fail** unless you change the setup.

**Fix we use here:** Keep one **public URL** that points at Vite only. The browser sends API requests **to the same host** as the page (e.g. `https://xyz.ngrok-free.app/api/...`). Vite **forwards** those to `http://127.0.0.1:8000` on your laptop. Your visitors never need to know about port 8000.

---

### B2. Prerequisites on your Mac

#### B2.1 You already use the project locally

You should be able to run:

```bash
cd /path/to/alpha_agent_builder
./start_alpha_agent_builder.sh
```

Then open `http://127.0.0.1:5173` and log in. If that does not work, fix local setup first.

#### B2.2 Install a tunnel tool (pick one)

You need a small program that creates a **secure public URL** and forwards traffic to `localhost:5173`.

**Option A — ngrok (very common)**

1. Create a free account: [https://ngrok.com](https://ngrok.com)
2. Install ngrok (example with Homebrew):

   ```bash
   brew install ngrok/ngrok/ngrok
   ```

3. Add your auth token (ngrok dashboard shows the exact command), e.g.:

   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```

**Option B — Cloudflare quick tunnel (TryCloudflare, `cloudflared`)**

**Important:** For **quick tunnels**, you do **not** complete setup by logging into [trycloudflare.com](https://trycloudflare.com). That site is mainly informational. The **real** URL is created on **your Mac** when you run the command below; it appears in the terminal (a random `https://….trycloudflare.com` link). No Cloudflare account is required for this mode.

1. Install `cloudflared`: [Cloudflare — Install cloudflared](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/).
2. With the app already running on port **5173** (and Part B §3 proxy/`api.ts` changes applied), open a **second** terminal and run:

   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```

3. Copy the **`https://`…`trycloudflare.com`** line from the output and open it in the browser (incognito recommended).

**If it fails:** If you ever created a `~/.cloudflared/config.yaml`, quick mode can break — rename that folder/file temporarily (see Cloudflare’s [Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) note).

**Different product:** A **free Cloudflare account + dashboard tunnel** (stable hostname on **your** domain) is a separate, production-style flow — see Cloudflare’s “Create a Cloudflare Tunnel” docs, not TryCloudflare quick mode.

---

### B3. Code changes in this repo (required for public links)

Do these edits **in your copy of `alpha_agent_builder`** so remote browsers do not use `127.0.0.1:8000`.

#### B3.1 `frontend/vite.config.ts`

Replace the `server` block so Vite **proxies** API traffic to FastAPI **on your machine** and allows **tunnel hostnames** (this avoids “blocked host” / login issues with ngrok-style URLs).

**Full suggested file:**

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Allow dev server when opened via ngrok / cloudflared / similar Host headers.
    allowedHosts: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
});
```

**Security note:** `allowedHosts: true` is convenient for demos. For long-term use, prefer an explicit list or the env-based allow list described in [Vite server options](https://vite.dev/config/server-options.html#server-allowedhosts).

#### B3.2 `frontend/src/lib/api.ts`

**Goal:** When no override is set, use **relative** URLs (`/api/...`) so requests go through the **same public host** as the page (and hit the Vite proxy).

1. **Replace** the single line:

   ```ts
   const API_BASE = "http://127.0.0.1:8000";
   ```

   **With:**

   ```ts
   /**
    * Empty string => same origin as the page (use Vite proxy to FastAPI).
    * Optional: set `VITE_API_BASE` in `frontend/.env` to call the API directly, e.g. http://127.0.0.1:8000
    */
   const API_BASE =
     typeof import.meta.env.VITE_API_BASE === "string" && import.meta.env.VITE_API_BASE.trim() !== ""
       ? import.meta.env.VITE_API_BASE.replace(/\/$/, "")
       : "";

   function apiUrl(path: string): string {
     const p = path.startsWith("/") ? path : `/${path}`;
     return API_BASE ? `${API_BASE}${p}` : p;
   }
   ```

2. In the `request` function, change the `fetch` line from:

   ```ts
   const response = await fetch(`${API_BASE}${path}`, {
   ```

   to:

   ```ts
   const response = await fetch(apiUrl(path), {
   ```

3. In `uploadFiles`, change:

   ```ts
   const response = await fetch(`${API_BASE}/api/agents/${agent_id}/uploads`, {
   ```

   to:

   ```ts
   const response = await fetch(apiUrl(`/api/agents/${agent_id}/uploads`), {
   ```

**Optional — local “API only on :8000” again:** create `frontend/.env` with:

```env
VITE_API_BASE=http://127.0.0.1:8000
```

Then restart Vite. Public tunnel users should **not** rely on this; leave it unset for tunnel use.

#### B3.3 Backend CORS (usually unchanged for this approach)

With the **proxy** pattern, the browser talks to **one origin** (the tunnel URL → Vite). API calls are same-origin from the browser’s perspective, so you normally **do not** need to add your ngrok URL to FastAPI `allow_origins` in `backend/main.py`.

Only if you point the browser **directly** at `http://127.0.0.1:8000` **and** use a **different** site origin for the SPA would you extend CORS (not covered here).

---

### B4. Start the app on your laptop

In a **first terminal**:

```bash
cd /path/to/alpha_agent_builder
./start_alpha_agent_builder.sh
```

Wait until you see that the **backend** is on port **8000** and the **frontend** on **5173**.

**If the tunnel says it cannot connect to port 5173**, try binding the dev server to all interfaces:

```bash
FRONTEND_HOST=0.0.0.0 ./start_alpha_agent_builder.sh
```

(`start_alpha_agent_builder.sh` passes `--host` to Vite.)

---

### B5. Start the tunnel (second terminal)

#### Using ngrok

```bash
ngrok http 5173
```

Copy the **Forwarding** HTTPS URL (e.g. `https://abcd-123.eu.ngrok-free.app`).

#### Using cloudflared

```bash
cloudflared tunnel --url http://localhost:5173
```

Copy the printed `https://....trycloudflare.com` (or similar) URL.

---

### B6. Share and test

1. **On your laptop**, open the **tunnel HTTPS URL** in a **private/incognito** window (avoids stale cache / old service workers).
2. Try **sign up** or **login**. If it works there, send the **same HTTPS link** to someone else.
3. They use **your** CPU, disk, and network path to your APIs while the tunnel and app stay open.

---

### B7. ngrok free tier: browser warning page

Sometimes the first load shows an ngrok interstitial. After clicking through once, the app may load. If **API** calls get HTML instead of JSON, open DevTools → **Network** → check `POST .../api/auth/login` → **Response**. If it is HTML, search ngrok docs for current **“skip browser warning”** headers for programmatic requests, or use a paid/reserved domain that skips the interstitial.

---

### B8. What still does not “magically” work for remote visitors

- **“Open agent UI” links** that embed `http://127.0.0.1:someport` point at **the visitor’s** computer. Remote testers often **cannot** open your Gradio/React subprocess URLs unless you add more plumbing (extra tunnels or a hosted runner). The **builder** and **API** over the tunnel are what this guide covers first.
- **Your laptop must stay awake**, on the network, with tunnel + `./start_alpha_agent_builder.sh` still running.
- **Free tunnels** may **change URL** every time; you resend a new link after each restart unless you use a fixed subdomain (often paid).

---

### B9. Security (read this if you share the link widely)

- Anyone with the link can **try** to use whatever the app exposes (sign up, run agents on **your** machine).
- You are exposing **your computer** as a server. Treat the URL like a **temporary demo password**.
- Do **not** commit real API keys or `.env` secrets into git; keep tokens out of screenshots and screen shares.

For **real public production** (strangers, scaling, safe execution), use **Part A2** or **A3** — not “tunnel my laptop” alone.

---

### B10. Troubleshooting checklist

| Symptom | Things to check |
|--------|-----------------|
| Login button seems to do nothing | Open **DevTools → Console** and **Network**. Look for blocked host, failed `fetch`, or non‑JSON responses. |
| `Blocked request. This host ("....") is not allowed` | Confirm `allowedHosts: true` (or your hostname) is set in `vite.config.ts` and restart Vite. |
| API calls go to `127.0.0.1:8000` from another PC | `apiUrl` / `API_BASE` not applied or browser cache: hard refresh, restart `npm run dev`, try incognito. |
| Tunnel cannot connect | Is Vite on 5173? Try `FRONTEND_HOST=0.0.0.0`. Firewall allowing local listeners? |
| CORS errors in console mentioning port 8000 | You are probably bypassing the proxy (direct API from another origin). Use relative URLs with proxy, or fix CORS deliberately. |

---

### B11. Quick “revert to local-only”

To go back to **only** local development:

1. In `frontend/vite.config.ts`, remove `allowedHosts` and the `proxy` block.
2. In `frontend/src/lib/api.ts`, set `const API_BASE = "http://127.0.0.1:8000"` again, remove `apiUrl`, and use `${API_BASE}${path}` / `${API_BASE}/api/...` in both `fetch` calls as before.
3. Remove `frontend/.env` if you added `VITE_API_BASE`.

---

## Summary

- **Demos:** Part **A1** + Part **B** — tunnel to Vite, proxy API, share HTTPS link; **low or zero** monthly cost; **laptop must stay on**.
- **Commercial / strangers / paid:** Part **A2** or **A3** — hosted frontend + API, domain, CORS, persistence; add **Stripe** (or similar) if you want self-serve billing.
- **Costs:** Hosting often **tens of dollars per month** at MVP size; **LLM usage** can dominate; **domains** are yearly; **Stripe** takes a **percentage per charge**.

Keep this doc next to your machine while demoing; use **Part A** when you are ready to **treat the app like a product**.
