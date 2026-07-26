#!/usr/bin/env bash
set -euo pipefail

# Local demo credential bridge (managed by tools/fix_demo_autofill.mjs)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|SEED_USER_EMAIL|SEED_USER_PASSWORD|PROVISION_ADMIN_EMAIL|PROVISION_ADMIN_PASSWORD|BOOTSTRAP_ADMIN_EMAIL|BOOTSTRAP_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD|DEMO_TENANT|BOOTSTRAP_TENANT_SLUG|GOVERNANCE_TENANT_ID|TENANT_ID) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
if [ -n "${PROVISION_ADMIN_EMAIL:-}" ] && [ -n "${PROVISION_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$PROVISION_ADMIN_EMAIL"
  demo_credentials_password="$PROVISION_ADMIN_PASSWORD"
elif [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$BOOTSTRAP_ADMIN_EMAIL"
  demo_credentials_password="$BOOTSTRAP_ADMIN_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${SEED_USER_EMAIL:-}" ] && [ -n "${SEED_USER_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_USER_EMAIL"
  demo_credentials_password="$SEED_USER_PASSWORD"
elif [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  if [ -n "$demo_credentials_tenant" ]; then
    export NEXT_PUBLIC_DEMO_TENANT="$demo_credentials_tenant"
    export VITE_DEMO_TENANT="$demo_credentials_tenant"
    export REACT_APP_DEMO_TENANT="$demo_credentials_tenant"
  else
    unset NEXT_PUBLIC_DEMO_TENANT VITE_DEMO_TENANT REACT_APP_DEMO_TENANT
  fi
else
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD NEXT_PUBLIC_DEMO_TENANT
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD VITE_DEMO_TENANT
  unset REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD REACT_APP_DEMO_TENANT
fi
unset demo_credentials_email demo_credentials_password demo_credentials_tenant demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

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
if [[ "${NODE_ENV:-development}" != production && "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" == true ]]; then
  npx prisma db push
  node prisma/create-admin.js
fi
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
