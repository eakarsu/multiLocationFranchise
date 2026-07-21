# Completeness Review: multiLocationFranchise

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 110 project files (100 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Prototype-demo**

This is a prototype/demo for sales/customer operations. Generated gap/demo patterns are present: it contains 100 source files and visible routes/pages in `frontend/`, `backend/`, but those surfaces are not evidence of durable domain execution, verified integrations, or operational completion.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Integrate CRM, email/calendar, enrichment, consent, and suppression sources with bidirectional, deduplicated sync.
2. Implement explicit lead/account lifecycle, ownership, approvals, attribution, and handoff/retry states.
3. Add deliverability, opt-out, regional privacy, rate-limit, and human-review controls for automated outreach.
4. Measure conversion and data quality with representative end-to-end workflow tests rather than generated sample records.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.
- Regression risk is high because no recognizable project-owned automated tests cover the main path.

## Evidence inspected

- `backend/src/index.js:106`
- `backend/src/routes/customViews.js:34`
- `frontend/src/App.js`
- `backend/src/middleware/auth.js`
- `backend/package.json`
- `start.sh`

## Recommended next action

Stop adding generated pages; prove one sales/customer operations workflow against real services and persistent state, with tests and measurable acceptance criteria.

## Implementation progress (2026-07-20)

The reviewed sales/customer-operations slice has been replaced with a persistent, governed workflow. The repository is no longer relying on the generated gap pages or generic LLM routes cited above. It is not yet approved for production: real provider sandbox acceptance and credential mapping remain external work, and a credential found in Git history must be revoked/rotated and removed through an authorized history rewrite before launch.

Implemented:

- Added PostgreSQL models and additive migrations for leads, accounts, ownership, approvals, lifecycle transitions, attribution, consent history/current policy, suppressions, outreach review/delivery, enrichment, sync cursors/events, signed webhook receipts, and a durable retry/dead-letter outbox. Optimistic versions and database check constraints protect concurrent and non-application writes.
- Added fail-closed HTTPS adapters and explicit contracts for CRM, email, calendar, enrichment, consent, and suppression. CRM, consent, and suppression have deduplicated pull/inbound paths; all governed local changes fan out through stable idempotency keys; email/calendar/enrichment and provider state changes return through signed, replay-bounded, durably deduplicated webhooks.
- Added ownership acceptance, approval separation of duties, transactional handoff and conversion, account deduplication, attribution touches, data-quality/conversion metrics, and CRM propagation for each lifecycle change.
- Added deny-by-default outreach policy for invalid destinations, opt-outs, suppression, consent expiry, GDPR/CASL/SMS express consent, disposable domains, per-contact frequency, location daily limits, and mandatory independent human review. Bounce and complaint events create durable suppression state. Password-reset links are time limited, hashed for lookup, encrypted in the outbox, and never returned by the API.
- Replaced the destructive launcher with an immutable startup path; destructive demo seeding now requires explicit non-production opt-in and generates random passwords. Added separate migration/container targets, health/readiness checks, restricted container settings, CI, dependency updates, current-tree secret scanning, Dependabot, provider/privacy/operations runbooks, and a tested backup/restore procedure.
- Removed the executable OpenRouter/AI, mock/gap, custom sample-view, and synthetic readiness routes/pages. The frontend now builds with Vite and route-level code splitting.

Verification evidence:

- `npm run verify`: passed backend/frontend lint, 14 non-database tests, production frontend build, and both dependency audits with zero reported vulnerabilities.
- Database E2E: passed lead creation/deduplication, forced CRM failure and retry, assignment/acceptance, qualification, independent approval, consent, independently reviewed delivery, delivery webhook, handoff, conversion, inbound CRM/consent/enrichment/suppression, conflict rejection, opt-out, and metrics.
- Migrations: passed on a fresh PostgreSQL database and on a baseline-to-current upgrade containing a legacy plaintext reset token; the token was invalidated and schema drift comparison reported no difference.
- Backup/restore: custom-format dump restored to a new database with matching representative workflow row counts and no pending migration.
- Runtime smoke: production launcher served the built frontend, readiness returned 200 with security headers, malformed JSON returned a safe 400, and SIGINT shut down cleanly. `docker compose config` passed; image build could not be run locally because the Docker daemon was unavailable and is delegated to CI.
- Secret scans: the current project tree is clean. Full Git history records one inherited finding from the former launcher. Its exact fingerprint is baselined so CI rejects every new finding; revoke/rotate the affected credential, audit provider access, then perform an authorized history rewrite and remove the baseline.

Remaining production gates:

- Execute contract tests against the selected vendors' real sandboxes, map their fields/events to the documented contracts, complete privacy/legal review and data-retention configuration, and validate deliverability limits with operational owners.
- Run the checked-in CI and container builds on the target platform, complete load/observability testing, and close the historical credential incident before any production deployment.

### Runtime acceptance follow-up (2026-07-20)

- Added an explicit administrator-provisioning command that creates a bcrypt-backed PostgreSQL identity without changing an existing account.
- The launcher now consumes the caller-assigned API port exactly, binds to loopback, rejects an occupied port without killing its owner, and derives otherwise-required local-only values from existing validation secrets only under `NODE_ENV=test`; production configuration remains fail-closed.
- Rechecked startup, credential login, current-user session lookup, and authenticated API access on PostgreSQL `55677`, API `6158`, and UI allocation `6159`; `_runtime_non_suite_repair_shard2o.tsv` records `API_VERIFIED / startup_login_session_api`.
