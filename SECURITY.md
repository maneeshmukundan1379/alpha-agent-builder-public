# Security posture — Alpha Agent Builder (public)

This document is a **lightweight security checklist** for `alpha_agent_builder_public`. It maps typical enterprise review topics to **code locations** and **recommended next steps**. It is not a formal audit or certification.

---

## Scope

- **In scope:** FastAPI backend, React SPA, Docker deployment, SQLite persistence, generated-agent runtime (`Run` / Vite / subprocesses).
- **Out of scope:** Third-party LLM providers (OpenAI, Google), Railway’s own controls, and your GitHub account security — except where this app forwards tokens.

---

## Summary

| Area                         | Current note |
|-----------------------------|--------------|
| SQL injection               | Low risk: parameterized queries in `backend/auth_store.py`, `backend/generator.py`. |
| Auth on main API            | Bearer sessions on `/api/*` via `require_user` in `backend/main.py`. |
| Auth on agent preview URLs  | **Gap:** `/_agent_api/*` and `/_agent_vite/*` are **not** session-protected (see below). |
| Password storage            | **Gap:** single-step SHA-256 in `backend/auth_store.py` (`_hash_password`) — prefer Argon2/bcrypt + per-user salt. |
| Secrets at rest             | **Gap:** API keys / env text in SQLite (`user_env_text`, legacy columns) — plaintext on disk under `ALPHA_APP_DATA_DIR`. |
| Session lifecycle           | **Gap:** sessions in `sessions` table have no idle/absolute expiry in code (`backend/auth_store.py`). |
| Code execution              | Generated agents run on the **same host** as the app (`backend/runner.py`, subprocess + user env) — treat as high trust / isolation gap for strict enterprises. |
| CORS / tunnels              | `backend/main.py` — default + `CORS_ORIGINS` + optional regex; tighten for production. |
| Dependencies                | `backend/requirements.txt` — unpinned versions; pin for supply-chain reproducibility. |

---

## Checklist (mapped to codebase)

### Authentication & sessions

| Item | Status | Where |
|------|--------|--------|
| Bearer token issuance | OK | `backend/auth_store.py` — `create_session`, `secrets.token_urlsafe(32)` |
| Session resolution | OK | `backend/auth_store.py` — `get_user_by_session` |
| Protected API routes | OK | `backend/main.py` — `Depends(require_user)` on `/api/*` agent and settings routes |
| Session expiry | **Todo** | `backend/auth_store.py` — add `expires_at` (or periodic cleanup) and enforce on `get_user_by_session` |
| Password hashing | **Todo** | `backend/auth_store.py` — replace `_hash_password` with Argon2/bcrypt; migrate existing hashes on login |
| Brute-force / signup abuse | **Todo** | `backend/main.py` — rate limit `POST /api/auth/login`, `POST /api/auth/signup` (middleware or reverse proxy) |
| SSO (enterprise) | Optional | Not present; typically add OIDC/SAML in front of or instead of local auth |

### Authorization & multi-tenancy

| Item | Status | Where |
|------|--------|--------|
| Agent data scoped by `user_id` | OK | `backend/generator.py` — `_user_agents_dir`, `get_generated_agent`, upload paths |
| Edit-agent path allowlist | OK | `backend/agent_editor.py` — `EDITABLE_*`, `_normalize_editable_rel`, `_safe_agent_file` |
| **Running agent HTTP proxy (IDOR)** | **Todo** | `backend/main.py` — `proxy_generated_agent_api`, `proxy_generated_agent_vite*` — **no `require_user`**; `backend/runner.py` — `get_react_proxy_ports` |
| **Mitigation direction** | | Require `Authorization: Bearer` (or signed, time-limited token) and verify **session user owns `agent_id`** before proxying; or bind preview to private network only |

### Secrets & configuration

| Item | Status | Where |
|------|--------|--------|
| User `.env` blob storage | Review | `backend/auth_store.py` — `save_user_env_file`, `get_user_env_file_text` |
| Parsed env for subprocesses | Review | `backend/auth_store.py` — `get_user_process_env`; `backend/secrets_store.py` — `parse_dotenv_content` |
| Per-agent `.env` materialization | Review | `backend/secrets_store.py` — `write_agent_environment` |
| Git push with PAT | Review | `backend/github_sync.py` — `_git_auth_args`, token in `http.extraHeader` for `git` |
| Encryption at rest | **Todo** | Volume encryption (platform); optional app-level encryption for `user_env_text` |

### File upload & path safety

| Item | Status | Where |
|------|--------|--------|
| Basename for stored uploads | OK | `backend/generator.py` — `save_uploaded_files` uses `Path(original_name).name` |
| Extension allowlist | OK | `save_uploaded_files` vs `metadata.supported_upload_types` |
| Size limits | **Todo** | Add max bytes per file / per request in `backend/main.py` (`upload_agent_files`) |

### Transport & headers

| Item | Status | Where |
|------|--------|--------|
| CORS | Review | `backend/main.py` — `CORSMiddleware`, `CORS_ORIGINS`, `CORS_ORIGIN_REGEX` |
| Trusted proxies | Review | `Dockerfile` / `CMD` — `uvicorn` `--proxy-headers --forwarded-allow-ips=*`; restrict if possible to your edge |
| Security headers (CSP, etc.) | **Todo** | Add middleware or edge headers for `Content-Security-Policy`, `X-Content-Type-Options`, etc. |

### Operational

| Item | Status | Where |
|------|--------|--------|
| Health endpoint | OK | `backend/main.py` — `GET /health` (no secrets) |
| OpenAPI / docs exposure | Review | FastAPI defaults — consider `docs_url=None`, `redoc_url=None`, `openapi_url=None` in production `FastAPI(...)` |
| Dependency pinning | **Todo** | `backend/requirements.txt` |
| Container base | Review | `Dockerfile` — slim image; keep `apt`/`pip` updated |

### Generated code execution (inherent risk)

| Item | Status | Where |
|------|--------|--------|
| Python / npm processes | Inherent | `backend/runner.py` — `subprocess.Popen` for uvicorn, Vite, Gradio |
| LLM writes to disk | Inherent | `backend/agent_editor.py`, `backend/codegen.py`, `backend/generator.py` |
| Enterprise expectation | | Sandboxed runners (separate container/job), no access to DB volume, network egress policies |

---

## Suggested priority order

1. **Protect `/_agent_api` and `/_agent_vite`** — same Bearer session + ownership check (or signed short-lived preview URLs).
2. **Replace password hashing** with Argon2 (or delegate to IdP).
3. **Session expiry** + optional rate limits on auth endpoints.
4. **Pin Python dependencies**; disable public `/docs` in production builds.
5. **Document** isolation roadmap for `Run` if selling to regulated customers.

---

## Reporting vulnerabilities

If you believe you’ve found a security issue in this repository’s code, contact the **repository maintainer** privately (do not open a public issue with exploit details until agreed). Include steps to reproduce and affected version/commit when possible.

---

## Disclaimer

This file is **guidance for developers and security reviewers**, not a warranty of fitness for any compliance regime (SOC 2, HIPAA, FedRAMP, etc.). Independent assessment is required for those.
