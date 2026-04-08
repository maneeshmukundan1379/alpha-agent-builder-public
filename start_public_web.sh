#!/usr/bin/env bash
#
# Local development only (hot reload). For production on a real server, use:
#   docker compose up --build -d
# See WEB_PUBLIC_README.md — that path does NOT require your laptop to stay online.
#
# This script binds 0.0.0.0 and uses ports 8001 + 5174 so you can run the private
# alpha_agent_builder in parallel (8000 + 5173).
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_VENV="$BACKEND_DIR/.venv"

export BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
export BACKEND_PORT="${BACKEND_PORT:-8001}"
export FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
export FRONTEND_PORT="${FRONTEND_PORT:-5174}"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name"
    exit 1
  fi
}

require_command python3
require_command npm

echo "Project directory: $PROJECT_DIR"
echo "Backend:  http://127.0.0.1:$BACKEND_PORT (listen $BACKEND_HOST:$BACKEND_PORT)"
echo "Frontend: http://127.0.0.1:$FRONTEND_PORT (listen $FRONTEND_HOST:$FRONTEND_PORT)"
echo

if [[ ! -d "$BACKEND_VENV" ]]; then
  echo "Creating backend virtual environment..."
  python3 -m venv "$BACKEND_VENV"
fi

echo "Installing backend dependencies..."
"$BACKEND_VENV/bin/pip" install -r "$BACKEND_DIR/requirements.txt" >/dev/null

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  (
    cd "$FRONTEND_DIR"
    npm install >/dev/null
  )
fi

echo "Starting backend (FastAPI)…"
(
  cd "$PROJECT_DIR"
  "$BACKEND_VENV/bin/python" -m uvicorn backend.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" --reload
) &
BACKEND_PID=$!

echo "Starting frontend (Vite, proxies /api → FastAPI)…"
(
  cd "$FRONTEND_DIR"
  npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Public web stack is up."
echo "• LAN:   http://$FRONTEND_HOST:$FRONTEND_PORT  (or this host’s IP on the same port)"
echo "• Production: docker compose (WEB_PUBLIC_README.md). Tunnel/ngrok here is optional dev-only."
echo "• Do not commit secrets; each visitor should sign up with their own account."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Press Ctrl+C to stop both services."
echo

wait "$BACKEND_PID" "$FRONTEND_PID"
