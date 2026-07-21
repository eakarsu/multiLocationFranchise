# Provider contracts

All outbound adapters require an HTTPS base URL and bearer API key. Plain HTTP is accepted only for loopback development. Every request has JSON content, a ten-second timeout, and a stable `Idempotency-Key`; providers must replay the original result for repeated keys.

| Capability | Outbound endpoint | Required success body |
| --- | --- | --- |
| CRM pull | `POST /sync/leads/pull` | `{ "records": [], "nextCursor": "..." }` |
| CRM upsert | `POST /sync/leads/upsert` | `{ "id": "stable-reference" }` |
| Email | `POST /messages/send` | `{ "id": "message-reference" }` |
| Calendar | `POST /events/handoff` | `{ "id": "event-reference" }` |
| Enrichment | `POST /leads/enrich` | `{ "id": "reference", "data": {}, "qualityScore": 0 }` |
| Consent pull/upsert | `POST /sync/consent/pull`, `POST /sync/consent/upsert` | page or stable reference |
| Suppression pull/upsert | `POST /sync/suppression/pull`, `POST /sync/suppression/upsert` | page or stable reference |

Sync pages are limited to 1,000 records. Each inbound record needs a stable `id`; reusing that ID with a different payload is rejected. Cursors advance only after every record in the page succeeds.

## Webhooks

Send the raw JSON body to `/api/webhooks/{provider}` with:

- `X-Webhook-Timestamp`: Unix seconds.
- `X-Webhook-Signature`: `v1=` followed by the lowercase hex HMAC-SHA256 of `{timestamp}.{rawBody}`.
- Body: `{ "id": "stable-event-id", "type": "event.type", "createdAt": "ISO-8601", "data": {} }`.

The timestamp must be within five minutes. Event IDs are durably deduplicated and failed receipts can retry up to five times.

Supported events include CRM `lead.updated`, email `message.delivered`, `message.bounced`, and `message.complained`, calendar `handoff.completed`, `handoff.failed`, and `handoff.cancelled`, enrichment `lead.enriched`, consent `consent.changed`, and suppression `suppression.added`. Bounce and complaint events immediately suppress the destination.
