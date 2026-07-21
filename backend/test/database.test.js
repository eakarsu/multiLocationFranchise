const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { ProviderError } = require('../src/revenue/providers');
const { processOutboxBatch } = require('../src/revenue/outbox');
const {
  createOrMergeLead,
  assignOwner,
  acceptOwnership,
  transitionLead,
  submitForApproval,
  decideApproval,
  recordConsent,
  requestOutreach,
  reviewOutreach,
  handoffLead,
  convertLead,
  ingestLeadSyncRecord,
  ingestConsentSyncRecord,
  ingestSuppressionSyncRecord,
  conversionMetrics,
} = require('../src/revenue/service');
const { ingestProviderWebhook } = require('../src/revenue/webhook-service');

const run = process.env.RUN_DB_TESTS === '1';

test('database-backed lead lifecycle, sync, policy, retry, handoff, and conversion', { skip: !run }, async (t) => {
  const prisma = new PrismaClient();
  t.after(() => prisma.$disconnect());

  await prisma.$transaction([
    prisma.providerWebhook.deleteMany(),
    prisma.revenueOutbox.deleteMany(),
    prisma.syncEvent.deleteMany(),
    prisma.syncCursor.deleteMany(),
    prisma.outreach.deleteMany(),
    prisma.consentEvent.deleteMany(),
    prisma.contactPolicy.deleteMany(),
    prisma.suppressionEntry.deleteMany(),
    prisma.enrichmentRecord.deleteMany(),
    prisma.attributionTouch.deleteMany(),
    prisma.leadTransition.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.account.deleteMany(),
  ]);

  const suffix = Date.now().toString(36);
  const location = await prisma.location.create({
    data: {
      name: `Revenue Test ${suffix}`,
      code: `REV-${suffix}`,
      address: '1 Test Way',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      phone: '+12125550199',
      email: `location-${suffix}@example.test`,
    },
  });
  const [manager, seller] = await Promise.all([
    prisma.user.create({
      data: {
        email: `manager-${suffix}@example.test`,
        password: 'not-used-in-service-tests',
        firstName: 'Morgan',
        lastName: 'Manager',
        role: 'LOCATION_MANAGER',
        locationId: location.id,
      },
    }),
    prisma.user.create({
      data: {
        email: `seller-${suffix}@example.test`,
        password: 'not-used-in-service-tests',
        firstName: 'Sam',
        lastName: 'Seller',
        role: 'STAFF',
        locationId: location.id,
      },
    }),
  ]);
  const managerActor = { id: manager.id, role: manager.role, locationId: location.id };
  const sellerActor = { id: seller.id, role: seller.role, locationId: location.id };

  let lead = await createOrMergeLead(prisma, managerActor, {
    locationId: location.id,
    email: `buyer-${suffix}@example.test`,
    phone: '+12125550100',
    firstName: 'Buyer',
    lastName: 'Example',
    companyName: 'Example Buyer LLC',
    countryCode: 'US',
    region: 'NY',
    source: 'integration-test',
    attributionSource: 'partner',
    attributionCampaign: 'summer',
  });
  assert.equal(lead.status, 'NEW');
  assert.equal(lead.qualityScore, 100);

  let failFirstCrmCall = true;
  const providers = {
    crm: {
      name: 'test-crm',
      async upsertLead(record) {
        if (failFirstCrmCall) {
          failFirstCrmCall = false;
          throw new ProviderError('test-crm', 'UNAVAILABLE', 'temporary CRM failure', true);
        }
        return { providerReference: record.id || `crm-${record.localId}` };
      },
    },
    email: {
      name: 'test-email',
      async send(message) {
        return { providerReference: `message-${message.metadata?.outreachId || suffix}` };
      },
    },
    calendar: {
      name: 'test-calendar',
      async createHandoff(event) {
        return { providerReference: `event-${event.metadata.leadId}` };
      },
    },
    consent: { name: 'test-consent', async upsert() { return { providerReference: `consent-${suffix}` }; } },
    suppression: { name: 'test-suppression', async upsert() { return { providerReference: `suppress-${suffix}` }; } },
  };

  assert.equal((await processOutboxBatch(prisma, 25, providers))[0].status, 'FAILED');
  let crmEvent = await prisma.revenueOutbox.findFirstOrThrow({ where: { topic: 'crm.lead.upsert' } });
  assert.equal(crmEvent.status, 'FAILED');
  await prisma.revenueOutbox.update({ where: { id: crmEvent.id }, data: { availableAt: new Date(0) } });
  assert.equal((await processOutboxBatch(prisma, 25, providers))[0].status, 'SUCCEEDED');

  lead = await assignOwner(prisma, managerActor, lead.id, seller.id, lead.version, 'Territory assignment');
  lead = await acceptOwnership(prisma, sellerActor, lead.id, lead.version);
  lead = await transitionLead(prisma, sellerActor, lead.id, 'QUALIFIED', lead.version, 'Meets qualification');
  lead = await submitForApproval(prisma, sellerActor, lead.id, lead.version, 'Ready for review');
  lead = await decideApproval(prisma, managerActor, lead.id, lead.version, 'APPROVED', 'Approved by manager');
  assert.equal(lead.approvalStatus, 'APPROVED');

  await recordConsent(prisma, sellerActor, lead.id, {
    channel: 'EMAIL',
    status: 'OPTED_IN',
    source: 'signed-form',
    legalBasis: 'consent',
    evidence: { formId: `form-${suffix}` },
    occurredAt: new Date().toISOString(),
  });
  const outreach = await requestOutreach(prisma, sellerActor, lead.id, {
    channel: 'EMAIL',
    subject: 'Welcome',
    body: 'Thanks for speaking with our franchise team.',
    idempotencyKey: `outreach-${suffix}`,
  });
  assert.equal(outreach.status, 'PENDING_REVIEW');
  await assert.rejects(
    reviewOutreach(prisma, sellerActor, outreach.id, 'APPROVED'),
    { code: 'FORBIDDEN' },
  );
  await reviewOutreach(prisma, managerActor, outreach.id, 'APPROVED');
  await processOutboxBatch(prisma, 25, providers);
  assert.equal((await prisma.outreach.findUniqueOrThrow({ where: { id: outreach.id } })).status, 'SENT');
  await ingestProviderWebhook(prisma, 'email', {
    id: `delivered-${suffix}`,
    type: 'message.delivered',
    data: { messageReference: `message-${outreach.id}` },
  });
  assert.equal((await prisma.outreach.findUniqueOrThrow({ where: { id: outreach.id } })).status, 'DELIVERED');

  lead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
  assert.equal(lead.status, 'CONTACTED');
  lead = await handoffLead(prisma, sellerActor, lead.id, lead.version, {
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    notes: 'Discovery call',
  });
  assert.equal(lead.handoffStatus, 'IN_PROGRESS');
  await processOutboxBatch(prisma, 25, providers);
  lead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
  assert.equal(lead.handoffStatus, 'COMPLETED');

  const conversion = await convertLead(prisma, sellerActor, lead.id, lead.version, {
    name: 'Example Buyer LLC',
    domain: `buyer-${suffix}.example.test`,
  });
  assert.equal(conversion.lead.status, 'CONVERTED');
  assert.equal(conversion.account.status, 'ACTIVE');

  const inbound = {
    id: `external-${suffix}`,
    email: `inbound-${suffix}@example.test`,
    locationId: location.id,
    source: 'crm',
  };
  const inboundResult = await ingestLeadSyncRecord(prisma, 'crm', inbound);
  assert.equal(inboundResult.duplicate, false);
  assert.equal((await ingestLeadSyncRecord(prisma, 'crm', inbound)).duplicate, true);
  await assert.rejects(
    ingestLeadSyncRecord(prisma, 'crm', { ...inbound, companyName: 'Reused ID' }),
    { code: 'SYNC_ID_REUSE' },
  );
  assert.equal((await ingestConsentSyncRecord(prisma, 'consent', {
    id: `consent-${suffix}`,
    leadId: inboundResult.leadId,
    channel: 'EMAIL',
    status: 'OPTED_IN',
    occurredAt: new Date().toISOString(),
  })).duplicate, false);
  assert.equal((await ingestConsentSyncRecord(prisma, 'consent', {
    id: `consent-${suffix}`,
    leadId: inboundResult.leadId,
    channel: 'EMAIL',
    status: 'OPTED_IN',
    occurredAt: (await prisma.syncEvent.findUniqueOrThrow({
      where: { idempotencyKey: `consent:inbound:consent:consent-${suffix}` },
    })).payload.occurredAt,
  })).duplicate, true);
  await ingestProviderWebhook(prisma, 'enrichment', {
    id: `enriched-${suffix}`,
    type: 'lead.enriched',
    data: {
      leadId: inboundResult.leadId,
      reference: `enrichment-${suffix}`,
      data: { companyName: 'Inbound Enriched LLC', countryCode: 'US', region: 'NY' },
      qualityScore: 80,
    },
  });
  assert.equal((await prisma.lead.findUniqueOrThrow({ where: { id: inboundResult.leadId } })).companyName, 'Inbound Enriched LLC');
  await ingestSuppressionSyncRecord(prisma, 'suppression', {
    id: `suppression-${suffix}`,
    channel: 'EMAIL',
    value: inbound.email,
    reason: 'LEGAL',
    active: true,
  });
  assert.equal((await prisma.lead.findUniqueOrThrow({ where: { id: inboundResult.leadId } })).status, 'SUPPRESSED');

  const suppressedLead = await createOrMergeLead(prisma, managerActor, {
    locationId: location.id,
    email: `optout-${suffix}@example.test`,
    countryCode: 'US',
    region: 'CA',
    source: 'integration-test',
  });
  await recordConsent(prisma, managerActor, suppressedLead.id, {
    channel: 'EMAIL',
    status: 'OPTED_OUT',
    source: 'preference-center',
    occurredAt: new Date().toISOString(),
  });
  assert.equal((await prisma.lead.findUniqueOrThrow({ where: { id: suppressedLead.id } })).status, 'SUPPRESSED');

  const metrics = await conversionMetrics(prisma, managerActor);
  assert.ok(metrics.total >= 3);
  assert.ok(metrics.converted >= 1);
  assert.ok(metrics.suppressed >= 1);
  assert.ok(metrics.averageQualityScore >= 0 && metrics.averageQualityScore <= 100);
});
