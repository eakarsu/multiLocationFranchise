# Audit Note - multiLocationFranchise

Source: `_AUDIT/reports/batch_10.md` (lines 467-506).

## Original Audit Recommendations

### What's Missing
- Real-time KPI dashboards per location.
- Franchisee certification/onboarding workflow automation.
- Territorial dispute resolution AI.
- Predictive franchisee health scoring (churn risk).
- Royalty/revenue forecasting.
- Multi-currency financial reconciliation.

### Custom Feature Suggestions
1. Franchisee marketplace.
2. Territorial optimization.
3. Predictive franchisee churn agent.
4. Voice/chat agent for franchisee support.
5. White-label analytics.

## Implementations Applied

Added 3 AI endpoints to `backend/src/routes/ai.js` matching the existing `generateAIAnalysis` pattern (Prisma-backed, AIAnalysis history persisted, uses callOpenRouter):
- `POST /api/ai/churn-prediction`
- `POST /api/ai/royalty-forecast`
- `POST /api/ai/kpi-dashboard-summary`

Each registers a new prompt template in the `prompts` map, follows existing data-loading patterns (Prisma queries on Location/FinancialData/etc.), persists results via `req.prisma.aIAnalysis.create`, and uses appropriate role middleware (`isCorporate` where applicable). No new dependencies.

## Backlog (Prioritized)

### High
- Multi-currency financial reconciliation (data model change + FX rate provider).
- Franchisee certification/onboarding workflow.
- Territorial dispute resolution flow.

### Medium
- Real-time per-location KPI streams (WebSocket).
- White-label analytics surfaces.
- Voice/chat franchisee support agent.

### Low / Product Decisions
- Franchisee marketplace.
- Territorial optimization (geo-clustering ML).

## Apply pass 3 (frontend)

LEFT-AS-IS. Frontend already wires the AI endpoints implemented in apply pass 2 (JWT Bearer auth from localStorage, 503-no-key handling via backend, existing styling). No changes required.

## Apply pass 4 (mechanical backlog)

Added 3 new mechanical AI endpoints to `backend/src/routes/ai.js` matching the existing `generateAIAnalysis` + Prisma `aIAnalysis.create` pattern, each guarded by an explicit 503-on-no-key check and `authenticateToken` (`isCorporate` where appropriate):
1. `POST /api/ai/territorial-dispute-resolution` — mediates territory overlaps. Loads `territory` + `locations` via Prisma. New `TERRITORIAL_DISPUTE_RESOLUTION` prompt template.
2. `POST /api/ai/onboarding-checklist` — generates franchisee onboarding/certification checklists. New `ONBOARDING_CHECKLIST` prompt template.
3. `POST /api/ai/white-label-analytics-summary` — brand-neutral analytics narrative for franchisee dashboards. New `WHITE_LABEL_ANALYTICS_SUMMARY` prompt template.

Frontend: extended `frontend/src/pages/AIAdvisors.js` with three new advisor cards (icons, descriptions, fields). JWT bearer auth is already attached via the api.js request interceptor; 503 errors surface through the existing error/toast UI.

No new dependencies. No schema changes. `node --check` passes for both modified files.

Remaining backlog: multi-currency reconciliation (TOO-RISKY: schema + FX provider), voice/chat agent (NEEDS-CREDS), real-time KPI streams (NEEDS-PRODUCT-DECISION + websocket infra), franchisee marketplace, geo-clustering ML.
