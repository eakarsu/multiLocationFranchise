# Multi-location franchise platform

This repository contains the franchise operations UI and a governed revenue workflow for leads and accounts. The revenue path is persistent and deterministic: ownership acceptance, approval separation of duties, human-reviewed outreach, consent and suppression enforcement, provider idempotency, retries, handoff, conversion, attribution, and data-quality metrics all live in PostgreSQL.

## Local verification

Requirements: Node.js 22.22 or newer and PostgreSQL 14 or newer.

1. Copy `.env.example` to `.env` and replace every secret placeholder. Provider adapters deliberately fail closed until their HTTPS URL and API key are configured.
2. Install locked dependencies with `npm run install:all`.
3. Apply migrations with `npm run prisma:migrate:deploy --prefix backend`.
4. Build the UI with `npm run build` and start with `./start.sh`.

`start.sh` never installs packages, kills processes, rewrites configuration, migrates, or seeds. Run migrations as a separate release step. The demo seed deletes data and is blocked unless `ALLOW_DESTRUCTIVE_DEMO_SEED=true` on a non-production database; it generates random one-time passwords.

Run `npm run verify` for lint, unit/integration tests, frontend build, and dependency audits. Database E2E requires an already migrated disposable database:

```sh
RUN_DB_TESTS=1 DATABASE_URL=postgresql://localhost/franchise_test npm run test:e2e --prefix backend
```

## Runtime workflows

- Authenticated revenue APIs are under `/api/revenue`.
- Signed provider webhooks are under `/api/webhooks/{crm|email|calendar|enrichment|consent|suppression}`.
- A scheduler calls `POST /api/internal/jobs/outbox` with the internal bearer secret. Run it at least once per minute; processing is safe to repeat.
- `/api/health/live` reports process liveness. `/api/health/ready` also checks PostgreSQL.

Provider payload contracts and webhook signing are in [docs/provider-contracts.md](docs/provider-contracts.md). Release, backup, retry, and incident procedures are in [docs/operations.md](docs/operations.md). Outreach rules are in [docs/privacy-outreach.md](docs/privacy-outreach.md).

## Containers

`compose.yaml` separates database migration from application startup. Set `POSTGRES_PASSWORD`, a `DATABASE_URL` using host `db`, and the required application secrets, then run `docker compose up --build`. Production deployments should use a managed secret store, managed PostgreSQL backups, TLS at the edge, and a dedicated outbox scheduler.
