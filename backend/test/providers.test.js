const test = require('node:test');
const assert = require('node:assert/strict');
const { createProviders, ProviderError } = require('../src/revenue/providers');

function environment(overrides = {}) {
  return {
    CRM_API_URL: 'https://crm.example.test/base/',
    CRM_API_KEY: 'crm-secret',
    EMAIL_API_URL: 'https://email.example.test/',
    EMAIL_API_KEY: 'email-secret',
    CALENDAR_API_URL: 'https://calendar.example.test/',
    CALENDAR_API_KEY: 'calendar-secret',
    ENRICHMENT_API_URL: 'https://enrichment.example.test/',
    ENRICHMENT_API_KEY: 'enrichment-secret',
    CONSENT_API_URL: 'https://consent.example.test/',
    CONSENT_API_KEY: 'consent-secret',
    SUPPRESSION_API_URL: 'https://suppression.example.test/',
    SUPPRESSION_API_KEY: 'suppression-secret',
    ...overrides,
  };
}

test('provider adapters fail closed when configuration is absent', async () => {
  const providers = createProviders({}, async () => {
    throw new Error('fetch must not run');
  });
  await assert.rejects(
    providers.crm.upsertLead({ id: 'lead-1' }, 'operation-1'),
    (error) => error instanceof ProviderError && error.code === 'NOT_CONFIGURED' && !error.retryable,
  );
});

test('provider adapters enforce HTTPS and propagate idempotency', async () => {
  let request;
  const providers = createProviders(environment(), async (url, options) => {
    request = { url: url.toString(), options };
    return new Response(JSON.stringify({ id: 'remote-123' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  const result = await providers.crm.upsertLead({ localId: 'local-1' }, 'operation-42');
  assert.equal(result.providerReference, 'remote-123');
  assert.equal(request.url, 'https://crm.example.test/sync/leads/upsert');
  assert.equal(request.options.headers['idempotency-key'], 'operation-42');
  assert.equal(request.options.headers.authorization, 'Bearer crm-secret');
});

test('retryable and terminal provider responses are classified', async () => {
  const retrying = createProviders(environment(), async () => new Response('', { status: 503 }));
  await assert.rejects(
    retrying.email.send({ to: 'a@example.com' }, 'send-1'),
    (error) => error instanceof ProviderError && error.retryable,
  );

  const rejected = createProviders(environment(), async () => new Response('', { status: 422 }));
  await assert.rejects(
    rejected.email.send({ to: 'a@example.com' }, 'send-2'),
    (error) => error instanceof ProviderError && !error.retryable,
  );
});

test('sync responses require bounded record arrays', async () => {
  const providers = createProviders(environment(), async () => new Response(JSON.stringify({ records: {} }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }));
  await assert.rejects(
    providers.consent.pullChanges({ idempotencyKey: 'pull-1' }),
    (error) => error instanceof ProviderError && error.code === 'INVALID_RESPONSE',
  );
});
