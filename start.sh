#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

APP_PORT="${BACKEND_PORT:-${PORT:-4000}}"
UI_PORT="${FRONTEND_PORT:-}"
if [[ ! "$APP_PORT" =~ ^[0-9]+$ ]] || (( APP_PORT < 1024 || APP_PORT > 65535 )); then
  echo "ERROR: BACKEND_PORT must be an integer from 1024 through 65535." >&2
  exit 1
fi

if [[ "${NODE_ENV:-production}" == "test" ]]; then
  CORS_ORIGINS="${CORS_ORIGINS:-http://127.0.0.1:$APP_PORT}"
  INTERNAL_JOB_SECRET="${INTERNAL_JOB_SECRET:-${JWT_SECRET:-}}"
  OUTBOX_ENCRYPTION_KEY="${OUTBOX_ENCRYPTION_KEY:-${MEMORY_ENCRYPTION_KEY_BASE64:-${JWT_SECRET:-}}}"
  PUBLIC_APP_URL="${PUBLIC_APP_URL:-http://127.0.0.1:$APP_PORT}"
  export CORS_ORIGINS INTERNAL_JOB_SECRET OUTBOX_ENCRYPTION_KEY PUBLIC_APP_URL
fi

required=(DATABASE_URL JWT_SECRET CORS_ORIGINS INTERNAL_JOB_SECRET OUTBOX_ENCRYPTION_KEY PUBLIC_APP_URL)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: ${name} must be set." >&2
    exit 1
  fi
done

if [[ ${#JWT_SECRET} -lt 32 ]]; then
  echo "ERROR: JWT_SECRET must contain at least 32 characters." >&2
  exit 1
fi

if [[ ${#INTERNAL_JOB_SECRET} -lt 32 ]]; then
  echo "ERROR: INTERNAL_JOB_SECRET must contain at least 32 characters." >&2
  exit 1
fi

if [[ ${#OUTBOX_ENCRYPTION_KEY} -lt 32 ]]; then
  echo "ERROR: OUTBOX_ENCRYPTION_KEY must contain at least 32 characters." >&2
  exit 1
fi

if [[ ! -d "$ROOT_DIR/backend/node_modules" ]]; then
  echo "ERROR: backend dependencies are missing; run npm ci during the build phase." >&2
  exit 1
fi

if [[ "${NODE_ENV:-production}" == "production" && ! -f "$ROOT_DIR/frontend/dist/index.html" ]]; then
  echo "ERROR: frontend production build is missing; run npm run build --prefix frontend." >&2
  exit 1
fi

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$APP_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: Port $APP_PORT is already in use; no process was changed." >&2
  exit 1
fi
if [[ -n "$UI_PORT" ]]; then
  if [[ ! "$UI_PORT" =~ ^[0-9]+$ ]] || (( UI_PORT < 1024 || UI_PORT > 65535 )) || [[ "$UI_PORT" == "$APP_PORT" ]]; then
    echo "ERROR: FRONTEND_PORT must be a distinct integer from 1024 through 65535." >&2
    exit 1
  fi
  if lsof -nP -iTCP:"$UI_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "ERROR: Port $UI_PORT is already in use; no process was changed." >&2
    exit 1
  fi
fi

cd "$ROOT_DIR/backend"
export PORT="$APP_PORT"
if [[ -z "$UI_PORT" ]]; then
  exec node src/index.js
fi

node src/index.js &
backend_pid=$!
(cd "$ROOT_DIR/frontend" && VITE_API_URL="http://127.0.0.1:$APP_PORT/api" npm start -- --host 127.0.0.1 --port "$UI_PORT" --strictPort) &
frontend_pid=$!
cleanup() {
  trap - INT TERM EXIT
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done
cleanup
set +e
wait "$backend_pid"; backend_status=$?
wait "$frontend_pid"; frontend_status=$?
set -e
if (( backend_status != 0 || frontend_status != 0 )); then
  echo "ERROR: a child service exited unexpectedly (backend=$backend_status frontend=$frontend_status)." >&2
  exit 1
fi
