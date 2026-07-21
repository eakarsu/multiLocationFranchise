# Operations runbook

## Release and migration

Back up PostgreSQL, run `prisma migrate deploy` as a one-shot release job, verify `/api/health/ready`, then shift traffic. Application startup never migrates or seeds. For databases originally created with `prisma db push`, first compare the live schema to `20260720090000_baseline/migration.sql`, correct any drift, then mark that migration applied with `prisma migrate resolve --applied 20260720090000_baseline`; do not blindly apply the baseline to populated tables.

The revenue migration is additive and invalidates all pre-existing password-reset tokens because the historical application stored them in plaintext. Rollback is application rollback plus database restore; destructive down migrations are intentionally not automated.

## Outbox and provider failures

Call `POST /api/internal/jobs/outbox?limit=25` with `Authorization: Bearer $INTERNAL_JOB_SECRET` at least once per minute. Claims are atomic. Retryable failures use exponential backoff and dead-letter after five attempts; terminal provider configuration or validation errors dead-letter immediately. Alert on any `RevenueOutbox.status = 'DEAD_LETTER'`, `ProviderWebhook.status = 'FAILED'`, or stale `SyncCursor.syncedAt`.

Before replaying a dead letter, fix the provider or payload, verify the provider honors the original idempotency key, and move only the chosen event back to `PENDING` with `attempts = 0` and `availableAt = NOW()`. Keep an incident note with the event ID and operator.

## Backup and restore drill

Use encrypted storage and retention policies appropriate to personal data. A representative logical drill is:

```sh
pg_dump --format=custom --no-owner --file=franchise.dump "$DATABASE_URL"
createdb franchise_restore_test
pg_restore --no-owner --dbname=franchise_restore_test franchise.dump
DATABASE_URL=postgresql://localhost/franchise_restore_test npm run prisma:migrate:deploy --prefix backend
```

Verify row counts for users, leads, accounts, consent events, suppressions, outreaches, sync events, and outbox events; run the readiness check and database E2E test; then destroy the temporary restored database and dump according to policy. Record duration and test recovery-time/recovery-point objectives quarterly.

## Secret and access response

Never commit provider keys or generated `.env` files. If a credential is exposed, revoke and rotate it first, identify provider access during the exposure window, update the secret store, redeploy, and scan both the current tree and full Git history. Rewriting Git history does not revoke a credential.
