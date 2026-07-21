# Privacy and outreach controls

Outreach is deny-by-default when a destination is invalid, suppressed, opted out, or has expired consent. SMS, Canadian contacts, and GDPR-region contacts require an explicit opt-in. The policy snapshot is stored with each outreach request and evaluated again immediately before delivery.

Every message requires review by a manager who did not request it. A contact can receive at most one delivered or sent outreach in 24 hours, and locations default to 100 messages per UTC day (`OUTREACH_DAILY_LIMIT`). Email hard bounces and complaints create durable suppressions. Opt-outs create both consent history and suppression state; later opt-in removes only an opt-out suppression, never a complaint, legal block, or hard bounce.

The application stores only evidence supplied by the configured consent system. Operators must configure retention periods, lawful bases, jurisdiction mappings, data-subject request procedures, and vendor data-processing agreements with counsel before production. Provider configuration is not proof of regulatory compliance.

For an incident, disable the email/calendar API keys, leave the outbox stopped, export affected `Outreach`, `ConsentEvent`, `ContactPolicy`, `SuppressionEntry`, `ProviderWebhook`, and `SyncEvent` records, then follow the organization’s privacy and breach-response process.
