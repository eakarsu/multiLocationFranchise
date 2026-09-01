# syntax=docker/dockerfile:1.7
FROM node:26.8-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:26.8-bookworm-slim AS backend-deps
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci && npx prisma generate

FROM backend-deps AS migrate
COPY backend/ ./
CMD ["npx", "prisma", "migrate", "deploy"]

FROM backend-deps AS backend-production-deps
RUN npm prune --omit=dev

FROM node:26.8-bookworm-slim AS app
ENV NODE_ENV=production PORT=4000
WORKDIR /app/backend
RUN groupadd --system app && useradd --system --gid app --home-dir /app app
COPY --chown=app:app backend/ ./
COPY --from=backend-production-deps --chown=app:app /build/backend/node_modules ./node_modules
COPY --from=frontend-build --chown=app:app /build/frontend/dist /app/frontend/dist
USER app
EXPOSE 4000
CMD ["node", "src/index.js"]
