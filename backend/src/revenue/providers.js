class ProviderError extends Error {
  constructor(provider, code, message, retryable) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.code = code;
    this.retryable = retryable;
  }
}

function providerConfig(environment, prefix, fallback) {
  return {
    name: environment[`${prefix}_PROVIDER`] || fallback,
    baseUrl: environment[`${prefix}_API_URL`],
    apiKey: environment[`${prefix}_API_KEY`],
  };
}

function configuredUrl(config) {
  if (!config.baseUrl || !config.apiKey) {
    throw new ProviderError(config.name, 'NOT_CONFIGURED', `${config.name} is not configured`, false);
  }
  let url;
  try {
    url = new URL(config.baseUrl);
  } catch {
    throw new ProviderError(config.name, 'NOT_CONFIGURED', `${config.name} base URL is invalid`, false);
  }
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new ProviderError(config.name, 'NOT_CONFIGURED', `${config.name} must use HTTPS`, false);
  }
  return url;
}

async function callProvider(config, path, payload, idempotencyKey, fetchImpl) {
  const baseUrl = configuredUrl(config);
  let response;
  try {
    response = await fetchImpl(new URL(path, baseUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ProviderError(config.name, 'UNAVAILABLE', `${config.name} is unavailable`, true);
  }
  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 409 ||
      response.status === 429 || response.status >= 500;
    throw new ProviderError(
      config.name,
      retryable ? 'UNAVAILABLE' : 'REJECTED',
      `${config.name} rejected the request (${response.status})`,
      retryable,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new ProviderError(config.name, 'INVALID_RESPONSE', `${config.name} returned invalid JSON`, false);
  }
}

function reference(result, provider) {
  const value = result?.id || result?.providerReference;
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) {
    throw new ProviderError(provider, 'INVALID_RESPONSE', `${provider} reference is missing`, false);
  }
  return value;
}

function syncPage(result, provider) {
  if (!result || !Array.isArray(result.records) || result.records.length > 1000) {
    throw new ProviderError(provider, 'INVALID_RESPONSE', `${provider} sync page is invalid`, false);
  }
  return {
    records: result.records,
    nextCursor: typeof result.nextCursor === 'string' ? result.nextCursor : null,
  };
}

function createProviders(environment = process.env, fetchImpl = fetch) {
  const crm = providerConfig(environment, 'CRM', 'crm');
  const email = providerConfig(environment, 'EMAIL', 'email');
  const calendar = providerConfig(environment, 'CALENDAR', 'calendar');
  const enrichment = providerConfig(environment, 'ENRICHMENT', 'enrichment');
  const consent = providerConfig(environment, 'CONSENT', 'consent');
  const suppression = providerConfig(environment, 'SUPPRESSION', 'suppression');

  return {
    crm: {
      name: crm.name,
      async pullLeads({ cursor, limit = 100, idempotencyKey }) {
        return syncPage(
          await callProvider(crm, '/sync/leads/pull', { cursor, limit }, idempotencyKey, fetchImpl),
          crm.name,
        );
      },
      async upsertLead(lead, idempotencyKey) {
        const result = await callProvider(crm, '/sync/leads/upsert', lead, idempotencyKey, fetchImpl);
        return { providerReference: reference(result, crm.name), raw: result };
      },
    },
    email: {
      name: email.name,
      async send(message, idempotencyKey) {
        const result = await callProvider(email, '/messages/send', message, idempotencyKey, fetchImpl);
        return { providerReference: reference(result, email.name), raw: result };
      },
    },
    calendar: {
      name: calendar.name,
      async createHandoff(event, idempotencyKey) {
        const result = await callProvider(
          calendar,
          '/events/handoff',
          event,
          idempotencyKey,
          fetchImpl,
        );
        return { providerReference: reference(result, calendar.name), raw: result };
      },
    },
    enrichment: {
      name: enrichment.name,
      async enrichLead(identity, idempotencyKey) {
        const result = await callProvider(
          enrichment,
          '/leads/enrich',
          identity,
          idempotencyKey,
          fetchImpl,
        );
        if (!result || typeof result.data !== 'object' || result.data === null) {
          throw new ProviderError(
            enrichment.name,
            'INVALID_RESPONSE',
            `${enrichment.name} enrichment payload is invalid`,
            false,
          );
        }
        return {
          providerReference: reference(result, enrichment.name),
          data: result.data,
          qualityScore: Number.isInteger(result.qualityScore) ? result.qualityScore : null,
          raw: result,
        };
      },
    },
    consent: {
      name: consent.name,
      async pullChanges({ cursor, limit = 100, idempotencyKey }) {
        return syncPage(
          await callProvider(consent, '/sync/consent/pull', { cursor, limit }, idempotencyKey, fetchImpl),
          consent.name,
        );
      },
      async upsert(record, idempotencyKey) {
        const result = await callProvider(
          consent,
          '/sync/consent/upsert',
          record,
          idempotencyKey,
          fetchImpl,
        );
        return { providerReference: reference(result, consent.name), raw: result };
      },
    },
    suppression: {
      name: suppression.name,
      async pullChanges({ cursor, limit = 100, idempotencyKey }) {
        return syncPage(
          await callProvider(
            suppression,
            '/sync/suppression/pull',
            { cursor, limit },
            idempotencyKey,
            fetchImpl,
          ),
          suppression.name,
        );
      },
      async upsert(record, idempotencyKey) {
        const result = await callProvider(
          suppression,
          '/sync/suppression/upsert',
          record,
          idempotencyKey,
          fetchImpl,
        );
        return { providerReference: reference(result, suppression.name), raw: result };
      },
    },
  };
}

module.exports = { ProviderError, createProviders };
