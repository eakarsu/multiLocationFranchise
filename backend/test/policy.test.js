const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeEmail,
  normalizePhone,
  leadDedupeKey,
  assertLeadTransition,
  assertExpectedVersion,
  evaluateContactPolicy,
} = require('../src/revenue/policy');

test('contact identities are normalized before deterministic deduplication', () => {
  assert.equal(normalizeEmail(' Alice@Example.COM '), 'alice@example.com');
  assert.equal(normalizePhone('+1 (212) 555-0100'), '+12125550100');
  assert.equal(
    leadDedupeKey({ email: 'Alice@Example.com' }),
    leadDedupeKey({ email: ' alice@example.COM ' }),
  );
  assert.equal(normalizeEmail('not-an-email'), null);
  assert.equal(normalizePhone('123'), null);
});

test('lead transitions and optimistic versions fail closed', () => {
  assert.doesNotThrow(() => assertLeadTransition('NEW', 'QUALIFIED'));
  assert.throws(() => assertLeadTransition('NEW', 'APPROVED'), { code: 'INVALID_LEAD_TRANSITION' });
  assert.doesNotThrow(() => assertExpectedVersion(4, 4));
  assert.throws(() => assertExpectedVersion(4, 3), { code: 'VERSION_CONFLICT' });
});

test('regional consent, suppression, and frequency rules are deterministic', () => {
  const lead = { email: 'buyer@example.eu', countryCode: 'DE', region: 'BE' };
  const withoutConsent = evaluateContactPolicy({ channel: 'EMAIL', lead });
  assert.equal(withoutConsent.allowed, false);
  assert.equal(withoutConsent.regime, 'GDPR');
  assert.match(withoutConsent.reasons.join(' '), /Express opt-in/);

  const permitted = evaluateContactPolicy({
    channel: 'EMAIL',
    lead,
    policy: { consentStatus: 'OPTED_IN', doNotContact: false },
  });
  assert.equal(permitted.allowed, true);
  assert.equal(permitted.requiresReview, true);

  const blocked = evaluateContactPolicy({
    channel: 'EMAIL',
    lead,
    policy: { consentStatus: 'OPTED_IN', doNotContact: false },
    suppression: { active: true, reason: 'COMPLAINT' },
    sentWithin24Hours: 1,
  });
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reasons.join(' '), /suppressed/i);
  assert.match(blocked.reasons.join(' '), /24-hour/i);
});

test('SMS always requires express opt-in', () => {
  const lead = { phone: '+12125550100', countryCode: 'US', region: 'NY' };
  assert.equal(evaluateContactPolicy({ channel: 'SMS', lead }).allowed, false);
  assert.equal(evaluateContactPolicy({
    channel: 'SMS',
    lead,
    policy: { consentStatus: 'OPTED_IN', doNotContact: false },
  }).allowed, true);
});
