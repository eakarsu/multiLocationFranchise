const { createHash } = require('node:crypto');
const { DomainError } = require('./errors');

const TRANSITIONS = {
  NEW: ['QUALIFIED', 'DISQUALIFIED', 'SUPPRESSED'],
  QUALIFIED: ['PENDING_APPROVAL', 'DISQUALIFIED', 'SUPPRESSED'],
  DISQUALIFIED: ['QUALIFIED'],
  PENDING_APPROVAL: ['APPROVED', 'DISQUALIFIED', 'SUPPRESSED'],
  APPROVED: ['CONTACTED', 'HANDED_OFF', 'LOST', 'SUPPRESSED'],
  CONTACTED: ['NURTURING', 'HANDED_OFF', 'CONVERTED', 'LOST', 'SUPPRESSED'],
  NURTURING: ['CONTACTED', 'HANDED_OFF', 'CONVERTED', 'LOST', 'SUPPRESSED'],
  HANDED_OFF: ['CONTACTED', 'CONVERTED', 'LOST', 'SUPPRESSED'],
  CONVERTED: [],
  LOST: ['QUALIFIED'],
  SUPPRESSED: ['QUALIFIED'],
};

const GDPR_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR',
  'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT', 'NL', 'NO', 'PL', 'PT',
  'RO', 'SE', 'SI', 'SK', 'GB',
]);

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
]);

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return null;
  return email;
}

function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  const digits = input.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function digest(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function leadDedupeKey({ email, phone, externalCrmId }) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) return `email:${digest(normalizedEmail)}`;
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone) return `phone:${digest(normalizedPhone)}`;
  if (externalCrmId) return `crm:${digest(String(externalCrmId).trim())}`;
  throw new DomainError(
    'CONTACT_IDENTITY_REQUIRED',
    'A valid email, phone, or external CRM identifier is required',
    400,
  );
}

function accountDedupeKey({ domain, name }) {
  const normalizedDomain = typeof domain === 'string'
    ? domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    : '';
  const normalizedName = typeof name === 'string' ? name.trim().toLowerCase() : '';
  if (!normalizedDomain && !normalizedName) {
    throw new DomainError('ACCOUNT_IDENTITY_REQUIRED', 'Account name or domain is required', 400);
  }
  return `${normalizedDomain ? 'domain' : 'name'}:${digest(normalizedDomain || normalizedName)}`;
}

function assertLeadTransition(from, to) {
  if (from === to || !TRANSITIONS[from]?.includes(to)) {
    throw new DomainError(
      'INVALID_LEAD_TRANSITION',
      `Lead cannot transition from ${from} to ${to}`,
    );
  }
}

function assertExpectedVersion(actual, expected) {
  if (!Number.isInteger(expected) || expected < 1) {
    throw new DomainError('VERSION_REQUIRED', 'A positive expectedVersion is required', 400);
  }
  if (actual !== expected) {
    throw new DomainError(
      'VERSION_CONFLICT',
      `Expected version ${expected}; current version is ${actual}`,
    );
  }
}

function contactValue(channel, lead) {
  if (channel === 'EMAIL') return normalizeEmail(lead.email);
  if (channel === 'SMS') return normalizePhone(lead.phone);
  return null;
}

function evaluateContactPolicy({
  channel,
  lead,
  policy,
  suppression,
  sentWithin24Hours = 0,
  locationSentToday = 0,
  locationDailyLimit = 100,
  now = new Date(),
}) {
  const value = contactValue(channel, lead);
  const reasons = [];
  if (!value) reasons.push(`A valid ${channel.toLowerCase()} destination is required`);
  if (suppression?.active && (!suppression.expiresAt || suppression.expiresAt > now)) {
    reasons.push(`Destination is suppressed: ${suppression.reason}`);
  }
  if (policy?.doNotContact || policy?.consentStatus === 'OPTED_OUT') {
    reasons.push('Contact has opted out');
  }
  if (policy?.expiresAt && policy.expiresAt <= now) reasons.push('Consent has expired');

  const country = String(lead.countryCode || 'US').toUpperCase();
  const expressConsentRequired = channel === 'SMS' || GDPR_COUNTRIES.has(country) || country === 'CA';
  if (expressConsentRequired && policy?.consentStatus !== 'OPTED_IN') {
    reasons.push('Express opt-in is required for this channel or region');
  }
  if (channel === 'EMAIL' && value) {
    const domain = value.split('@')[1];
    if (DISPOSABLE_DOMAINS.has(domain)) reasons.push('Disposable email domains are not deliverable');
  }
  if (sentWithin24Hours > 0) reasons.push('Per-contact 24-hour outreach limit reached');
  if (locationSentToday >= locationDailyLimit) reasons.push('Location daily outreach limit reached');

  return {
    allowed: reasons.length === 0,
    requiresReview: true,
    destination: value,
    regime: GDPR_COUNTRIES.has(country) ? 'GDPR' : country === 'CA' ? 'CASL' :
      lead.region === 'CA' && country === 'US' ? 'CCPA' : 'US_GENERIC',
    consentStatus: policy?.consentStatus || 'UNKNOWN',
    evaluatedAt: now.toISOString(),
    reasons,
  };
}

module.exports = {
  TRANSITIONS,
  normalizeEmail,
  normalizePhone,
  digest,
  leadDedupeKey,
  accountDedupeKey,
  assertLeadTransition,
  assertExpectedVersion,
  contactValue,
  evaluateContactPolicy,
};
