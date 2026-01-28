#!/usr/bin/env bash
set -euo pipefail

# Save the script's directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

BACKEND_PORT="${PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DB_NAME="franchise_platform"

echo "=========================================="
echo "  Multi-Location Franchise AI Platform"
echo "=========================================="
echo ""

# Set default DATABASE_URL if not provided
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "==> DATABASE_URL not set, using default..."
  DB_USER="${USER:-$(whoami)}"
  export DATABASE_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}?schema=public"
fi
echo "DATABASE_URL: ${DATABASE_URL}"
echo ""

# Check if PostgreSQL is running
echo "==> Checking PostgreSQL status..."
if ! command -v psql &> /dev/null; then
  echo "WARNING: psql command not found. Assuming PostgreSQL is configured correctly."
else
  # Try to connect to PostgreSQL server
  if ! psql -h localhost -c "SELECT 1;" postgres >/dev/null 2>&1 && \
     ! psql -c "SELECT 1;" postgres >/dev/null 2>&1; then
    echo ""
    echo "ERROR: Cannot connect to PostgreSQL server."
    echo ""
    echo "Please start PostgreSQL:"
    echo "  macOS:  brew services start postgresql"
    echo "  Linux:  sudo systemctl start postgresql"
    echo ""
    exit 1
  fi
  echo "PostgreSQL server is running."

  # Create database if it doesn't exist
  echo ""
  echo "==> Ensuring database '${DB_NAME}' exists..."
  if ! psql -h localhost -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}" && \
     ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo "Creating database '${DB_NAME}'..."
    createdb "${DB_NAME}" 2>/dev/null || createdb -h localhost "${DB_NAME}" 2>/dev/null || {
      echo "Could not create database automatically."
      echo "Please create it manually: createdb ${DB_NAME}"
      exit 1
    }
    echo "Database created successfully!"
  else
    echo "Database '${DB_NAME}' already exists."
  fi
fi

# Clean up processes on ports
echo ""
echo "==> Cleaning up processes on ports ${BACKEND_PORT} and ${FRONTEND_PORT}..."
for port in ${BACKEND_PORT} ${FRONTEND_PORT}; do
  if lsof -ti tcp:"${port}" >/dev/null 2>&1; then
    echo "Found processes on port ${port}, killing them..."
    lsof -ti tcp:"${port}" | xargs kill -9 || true
    sleep 1
  fi
done
echo "Ports cleaned up."

# Navigate to backend directory
cd "$SCRIPT_DIR/backend"

# Update .env file with current DATABASE_URL
echo ""
echo "==> Updating backend .env file..."
if [ -f ".env" ]; then
  if grep -q "^DATABASE_URL=" .env; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env 2>/dev/null || \
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
  else
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
  fi
else
  cat > .env << EOF
DATABASE_URL="${DATABASE_URL}"
JWT_SECRET="franchise-platform-super-secret-jwt-key-2024"
PORT=${BACKEND_PORT}
OPENROUTER_API_KEY="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"
OPENROUTER_MODEL="anthropic/claude-3-haiku"
EOF
fi
echo ".env file updated."

# Check if node_modules exists for backend
if [ ! -d "node_modules" ]; then
  echo ""
  echo "==> Installing backend dependencies..."
  npm install
fi

# Generate Prisma client
echo ""
echo "==> Generating Prisma client..."
npx prisma generate

# Run database migrations
echo ""
echo "==> Running Prisma migrations..."
npx prisma db push || {
  echo "Migration failed. Trying to create initial schema..."
  npx prisma db push --force-reset
}

# Check if database needs seeding
echo ""
echo "==> Checking if database needs seeding..."
USER_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ' || echo "0")
TERRITORY_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"Territory\";" 2>/dev/null | tr -d ' ' || echo "0")

if [ "${USER_COUNT}" = "0" ] || [ -z "${USER_COUNT}" ]; then
  # Check if there's partial data (territories exist but users don't)
  if [ "${TERRITORY_COUNT}" != "0" ] && [ -n "${TERRITORY_COUNT}" ]; then
    echo "Detected partial seed data. Resetting database..."
    npx prisma db push --force-reset
  fi
  echo "Database appears empty. Running seed..."
  npm run seed
else
  echo "Database already contains data (${USER_COUNT} users). Skipping seed."
fi

# Navigate to frontend directory
cd "$SCRIPT_DIR/frontend"

# Check if node_modules exists for frontend
if [ ! -d "node_modules" ]; then
  echo ""
  echo "==> Installing frontend dependencies..."
  npm install
fi

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "==> Shutting down servers..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo "Servers stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start the application
echo ""
echo "=========================================="
echo "  Starting Franchise Platform"
echo "=========================================="
echo ""
echo "Backend API: http://localhost:${BACKEND_PORT}"
echo "Frontend:    http://localhost:${FRONTEND_PORT}"
echo ""
echo "Test credentials:"
echo "  Admin: admin@franchise.com / admin123"
echo "  Corporate: corporate@franchise.com / corp123"
echo "  Manager: manager@downtown.franchise.com / manager123"
echo ""

# Start backend
echo "==> Starting backend server..."
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "==> Starting frontend server..."
cd "$SCRIPT_DIR/frontend"
BROWSER=none PORT=${FRONTEND_PORT} npm start &
FRONTEND_PID=$!

echo ""
echo "Both servers are now running!"
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
