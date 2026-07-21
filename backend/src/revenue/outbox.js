const { createProviders, ProviderError } = require('./providers');
const { evaluateLeadContact, queueCrmLead } = require('./service');
const { open } = require('./secrets');

function hash(value) {
  return require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function recordOutboundSync(prisma, event, provider, resourceType, externalId, response) {
  await prisma.syncEvent.upsert({
    where: { idempotencyKey: event.idempotencyKey },
    update: {
      status: 'SUCCEEDED',
      attempts: { increment: 1 },
      processedAt: new Date(),
      payload: { request: event.payload, response },
    },
    create: {
      provider,
      direction: 'OUTBOUND',
      resourceType,
      externalId: `${externalId}:${event.id}`,
      idempotencyKey: event.idempotencyKey,
      payloadHash: hash(event.payload),
      payload: { request: event.payload, response },
      status: 'SUCCEEDED',
      attempts: 1,
      processedAt: new Date(),
    },
  });
}

async function deliverOutreach(prisma, providers, event) {
  const outreach = await prisma.outreach.findUnique({
    where: { id: event.aggregateId },
    include: { lead: true },
  });
  if (!outreach || outreach.status === 'SENT' || outreach.status === 'DELIVERED') return;
  if (outreach.status !== 'QUEUED') throw new Error('Outreach is not queued');
  const policy = await evaluateLeadContact(prisma, outreach.lead, outreach.channel);
  if (!policy.allowed) {
    await prisma.outreach.update({
      where: { id: outreach.id },
      data: {
        status: 'SUPPRESSED',
        policySnapshot: policy,
        lastError: policy.reasons.join('; ').slice(0, 1000),
      },
    });
    return;
  }
  if (outreach.channel !== 'EMAIL') {
    throw new ProviderError('sms', 'NOT_CONFIGURED', 'SMS provider is not configured', false);
  }
  const result = await providers.email.send({
    to: policy.destination,
    subject: outreach.subject || '',
    body: outreach.body,
    metadata: { outreachId: outreach.id, leadId: outreach.leadId },
  }, event.idempotencyKey);
  await prisma.$transaction(async (tx) => {
    await tx.outreach.update({
      where: { id: outreach.id },
      data: {
        status: 'SENT',
        providerMessageId: result.providerReference,
        sentAt: new Date(),
        attempts: { increment: 1 },
        lastError: null,
      },
    });
    if (['APPROVED', 'NURTURING', 'HANDED_OFF'].includes(outreach.lead.status)) {
      const updatedLead = await tx.lead.update({
        where: { id: outreach.leadId },
        data: { status: 'CONTACTED', lastContactedAt: new Date(), version: { increment: 1 } },
      });
      await tx.leadTransition.create({
        data: {
          leadId: outreach.leadId,
          fromStatus: outreach.lead.status,
          toStatus: 'CONTACTED',
          reason: 'Approved outreach sent',
          metadata: { outreachId: outreach.id },
        },
      });
      await queueCrmLead(tx, outreach.leadId, updatedLead.version, 'outreach-sent', outreach.id);
    } else {
      await tx.lead.update({
        where: { id: outreach.leadId },
        data: { lastContactedAt: new Date() },
      });
    }
  });
  await recordOutboundSync(
    prisma,
    event,
    providers.email.name,
    'outreach',
    outreach.id,
    { providerReference: result.providerReference },
  );
}

async function deliverCrmLead(prisma, providers, event) {
  const lead = await prisma.lead.findUnique({
    where: { id: event.aggregateId },
    include: { account: true, policies: true, attribution: true },
  });
  if (!lead) return;
  const result = await providers.crm.upsertLead({
    id: lead.externalCrmId,
    localId: lead.id,
    email: lead.email,
    phone: lead.phone,
    firstName: lead.firstName,
    lastName: lead.lastName,
    companyName: lead.companyName,
    countryCode: lead.countryCode,
    region: lead.region,
    lifecycleStatus: lead.status,
    ownerId: lead.ownerId,
    account: lead.account,
    consent: lead.policies,
    attribution: lead.attribution,
    version: lead.version,
  }, event.idempotencyKey);
  if (!lead.externalCrmId) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { externalCrmId: result.providerReference },
    });
  }
  await recordOutboundSync(
    prisma,
    event,
    providers.crm.name,
    'lead',
    lead.id,
    { providerReference: result.providerReference },
  );
}

async function deliverCalendarHandoff(prisma, providers, event) {
  const lead = await prisma.lead.findUnique({
    where: { id: event.aggregateId },
    include: { owner: true, location: true },
  });
  if (!lead) return;
  const result = await providers.calendar.createHandoff({
    title: `Lead handoff: ${lead.companyName || lead.email || lead.id}`,
    startsAt: event.payload.startsAt || new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
    attendees: [lead.owner?.email, lead.location?.email].filter(Boolean),
    notes: event.payload.notes || '',
    metadata: { leadId: lead.id },
  }, event.idempotencyKey);
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: lead.id }, data: { handoffStatus: 'COMPLETED' } });
    await queueCrmLead(tx, lead.id, lead.version, 'handoff-completed', event.id);
  });
  await recordOutboundSync(
    prisma,
    event,
    providers.calendar.name,
    'handoff',
    lead.id,
    { providerReference: result.providerReference },
  );
}

async function deliverConsent(prisma, providers, event) {
  const { leadId, channel } = event.payload;
  const policy = await prisma.contactPolicy.findUnique({
    where: { leadId_channel: { leadId, channel } },
    include: { lead: true },
  });
  if (!policy) return;
  const result = await providers.consent.upsert({
    localLeadId: leadId,
    channel,
    destination: channel === 'EMAIL' ? policy.lead.email : policy.lead.phone,
    status: policy.consentStatus,
    legalBasis: policy.legalBasis,
    occurredAt: policy.recordedAt.toISOString(),
  }, event.idempotencyKey);
  await recordOutboundSync(
    prisma,
    event,
    providers.consent.name,
    'consent',
    `${leadId}:${channel}`,
    { providerReference: result.providerReference },
  );
}

async function deliverSuppression(prisma, providers, event) {
  const result = await providers.suppression.upsert({
    channel: event.payload.channel,
    destination: event.payload.normalizedValue,
    reason: event.payload.reason,
    active: true,
  }, event.idempotencyKey);
  await recordOutboundSync(
    prisma,
    event,
    providers.suppression.name,
    'suppression',
    `${event.payload.channel}:${event.payload.normalizedValue}`,
    { providerReference: result.providerReference },
  );
}

async function deliverAuthEmail(providers, event) {
  const recipient = event.payload.recipient;
  const encryptedResetUrl = event.payload.encryptedResetUrl;
  if (typeof recipient !== 'string' || typeof encryptedResetUrl !== 'string') {
    throw new Error('Authentication email payload is invalid');
  }
  const resetUrl = open(encryptedResetUrl);
  await providers.email.send({
    to: recipient,
    subject: 'Reset your franchise platform password',
    template: 'auth.reset-password',
    variables: { resetUrl },
  }, event.idempotencyKey);
}

async function deliver(prisma, providers, event) {
  switch (event.topic) {
    case 'outreach.send':
      return deliverOutreach(prisma, providers, event);
    case 'crm.lead.upsert':
      return deliverCrmLead(prisma, providers, event);
    case 'calendar.handoff.create':
      return deliverCalendarHandoff(prisma, providers, event);
    case 'consent.sync':
      return deliverConsent(prisma, providers, event);
    case 'suppression.sync':
      return deliverSuppression(prisma, providers, event);
    case 'auth.reset-password':
      return deliverAuthEmail(providers, event);
    default:
      throw new Error(`Unsupported outbox topic: ${event.topic}`);
  }
}

async function processOutboxBatch(prisma, limit = 25, providers = createProviders()) {
  const events = await prisma.revenueOutbox.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      attempts: { lt: 5 },
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    take: Math.min(100, Math.max(1, limit)),
  });
  const results = [];
  for (const event of events) {
    const claimed = await prisma.revenueOutbox.updateMany({
      where: { id: event.id, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) continue;
    try {
      await deliver(prisma, providers, event);
      await prisma.revenueOutbox.update({
        where: { id: event.id },
        data: { status: 'SUCCEEDED', processedAt: new Date(), lastError: null },
      });
      results.push({ id: event.id, status: 'SUCCEEDED' });
    } catch (error) {
      const retryable = !(error instanceof ProviderError) || error.retryable;
      const attempts = event.attempts + 1;
      await prisma.revenueOutbox.update({
        where: { id: event.id },
        data: {
          status: !retryable || attempts >= 5 ? 'DEAD_LETTER' : 'FAILED',
          availableAt: new Date(Date.now() + Math.min(60_000 * 2 ** attempts, 60 * 60_000)),
          lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Delivery failed',
          ...(!retryable ? { attempts: 5 } : {}),
        },
      });
      results.push({ id: event.id, status: !retryable ? 'DEAD_LETTER' : 'FAILED' });
    }
  }
  return results;
}

module.exports = { processOutboxBatch };
