const { Prisma } = require('@prisma/client');
const { createHash } = require('node:crypto');
const { DomainError } = require('./errors');
const { normalizeEmail, normalizePhone, TRANSITIONS } = require('./policy');
const { ingestLeadSyncRecord, recordConsent, queueCrmLead } = require('./service');

function requiredString(data, key) {
  const value = data[key];
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) {
    throw new DomainError('INVALID_WEBHOOK', `${key} is required`, 400);
  }
  return value;
}

async function applyEmailEvent(prisma, event) {
  const providerMessageId = requiredString(event.data, 'messageReference');
  const outreach = await prisma.outreach.findUnique({
    where: { providerMessageId },
    include: { lead: true },
  });
  if (!outreach) throw new DomainError('OUTREACH_NOT_FOUND', 'Message reference not found', 404);
  if (event.type === 'message.delivered') {
    await prisma.outreach.update({
      where: { id: outreach.id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
    return { ignored: false };
  }
  if (!['message.bounced', 'message.complained'].includes(event.type)) return { ignored: true };
  const reason = event.type === 'message.bounced' ? 'HARD_BOUNCE' : 'COMPLAINT';
  const destination = normalizeEmail(outreach.lead.email);
  if (!destination) throw new DomainError('INVALID_CONTACT', 'Lead email is invalid', 409);
  await prisma.$transaction(async (tx) => {
    await tx.outreach.update({
      where: { id: outreach.id },
      data: { status: event.type === 'message.bounced' ? 'BOUNCED' : 'COMPLAINED' },
    });
    await tx.suppressionEntry.upsert({
      where: { channel_normalizedValue: { channel: 'EMAIL', normalizedValue: destination } },
      update: { active: true, reason, source: 'email-webhook', expiresAt: null },
      create: {
        channel: 'EMAIL',
        normalizedValue: destination,
        reason,
        source: 'email-webhook',
      },
    });
    if (TRANSITIONS[outreach.lead.status]?.includes('SUPPRESSED')) {
      const updatedLead = await tx.lead.update({
        where: { id: outreach.leadId },
        data: { status: 'SUPPRESSED', version: { increment: 1 } },
      });
      await tx.leadTransition.create({
        data: {
          leadId: outreach.leadId,
          fromStatus: outreach.lead.status,
          toStatus: 'SUPPRESSED',
          reason: event.type,
        },
      });
      await queueCrmLead(tx, outreach.leadId, updatedLead.version, 'email-suppression', event.id);
    }
    await tx.revenueOutbox.upsert({
      where: { idempotencyKey: `suppression.sync:webhook:${event.id}` },
      update: {},
      create: {
        topic: 'suppression.sync',
        aggregateType: 'lead',
        aggregateId: outreach.leadId,
        idempotencyKey: `suppression.sync:webhook:${event.id}`,
        payload: { leadId: outreach.leadId, channel: 'EMAIL', normalizedValue: destination, reason },
      },
    });
  });
  return { ignored: false };
}

async function applySuppressionEvent(prisma, event) {
  const channel = requiredString(event.data, 'channel').toUpperCase();
  if (!['EMAIL', 'SMS'].includes(channel)) {
    throw new DomainError('INVALID_WEBHOOK', 'Suppression channel is invalid', 400);
  }
  const rawValue = requiredString(event.data, 'value');
  const normalizedValue = channel === 'EMAIL' ? normalizeEmail(rawValue) : normalizePhone(rawValue);
  if (!normalizedValue) throw new DomainError('INVALID_WEBHOOK', 'Suppression value is invalid', 400);
  const reason = typeof event.data.reason === 'string' &&
    ['OPT_OUT', 'HARD_BOUNCE', 'COMPLAINT', 'LEGAL', 'MANUAL'].includes(event.data.reason)
    ? event.data.reason
    : 'MANUAL';
  const lead = await prisma.lead.findFirst({
    where: channel === 'EMAIL' ? { normalizedEmail: normalizedValue } : { phone: normalizedValue },
  });
  await prisma.$transaction(async (tx) => {
    await tx.suppressionEntry.upsert({
      where: { channel_normalizedValue: { channel, normalizedValue } },
      update: { active: true, reason, source: 'suppression-webhook' },
      create: { channel, normalizedValue, reason, source: 'suppression-webhook' },
    });
    if (lead && TRANSITIONS[lead.status]?.includes('SUPPRESSED')) {
      const changed = await tx.lead.updateMany({
        where: { id: lead.id, version: lead.version, status: lead.status },
        data: { status: 'SUPPRESSED', version: { increment: 1 } },
      });
      if (changed.count === 1) await tx.leadTransition.create({
        data: {
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: 'SUPPRESSED',
          reason: 'Inbound suppression webhook',
          metadata: { externalEventId: event.id, channel, reason },
        },
      });
      if (changed.count === 1) await queueCrmLead(
        tx,
        lead.id,
        lead.version + 1,
        'inbound-suppression',
        event.id,
      );
    }
  });
  return { ignored: false };
}

async function applyCalendarEvent(prisma, event) {
  if (!['handoff.completed', 'handoff.failed', 'handoff.cancelled'].includes(event.type)) {
    return { ignored: true };
  }
  const leadId = requiredString(event.data, 'leadId');
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Calendar event lead not found', 404);
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        handoffStatus: event.type === 'handoff.completed' ? 'COMPLETED' : 'FAILED',
      },
    });
    await queueCrmLead(tx, leadId, lead.version, 'calendar-webhook', event.id);
  });
  return { ignored: false };
}

async function applyEnrichmentEvent(prisma, event) {
  if (event.type !== 'lead.enriched') return { ignored: true };
  const leadId = requiredString(event.data, 'leadId');
  const externalId = requiredString(event.data, 'reference');
  const data = event.data.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new DomainError('INVALID_WEBHOOK', 'Enrichment data is required', 400);
  }
  const qualityScore = Number.isInteger(event.data.qualityScore) &&
    event.data.qualityScore >= 0 && event.data.qualityScore <= 100
    ? event.data.qualityScore
    : null;
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Enrichment event lead not found', 404);
  await prisma.$transaction(async (tx) => {
    await tx.enrichmentRecord.upsert({
      where: { provider_externalId: { provider: 'enrichment', externalId } },
      update: {},
      create: {
        leadId,
        provider: 'enrichment',
        externalId,
        payloadHash: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
        data,
        qualityScore,
        appliedAt: new Date(),
      },
    });
    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        companyName: lead.companyName || (typeof data.companyName === 'string' ? data.companyName : undefined),
        countryCode: typeof data.countryCode === 'string' ? data.countryCode.slice(0, 2).toUpperCase() : lead.countryCode,
        region: typeof data.region === 'string' ? data.region.slice(0, 20).toUpperCase() : lead.region,
        qualityScore: Math.max(lead.qualityScore || 0, qualityScore || 0),
        version: { increment: 1 },
      },
    });
    await queueCrmLead(tx, leadId, updatedLead.version, 'enrichment-webhook', event.id);
  });
  return { ignored: false };
}

async function applyEvent(prisma, provider, event) {
  if (provider === 'email') return applyEmailEvent(prisma, event);
  if (provider === 'calendar') return applyCalendarEvent(prisma, event);
  if (provider === 'enrichment') return applyEnrichmentEvent(prisma, event);
  if (provider === 'crm' && event.type === 'lead.updated') {
    const record = event.data.record;
    if (!record || typeof record !== 'object') {
      throw new DomainError('INVALID_WEBHOOK', 'CRM lead record is required', 400);
    }
    await ingestLeadSyncRecord(prisma, 'crm', record);
    return { ignored: false };
  }
  if (provider === 'consent' && event.type === 'consent.changed') {
    const leadId = requiredString(event.data, 'leadId');
    const channel = requiredString(event.data, 'channel').toUpperCase();
    const status = requiredString(event.data, 'status').toUpperCase();
    if (!['EMAIL', 'SMS'].includes(channel) || !['UNKNOWN', 'OPTED_IN', 'OPTED_OUT'].includes(status)) {
      throw new DomainError('INVALID_WEBHOOK', 'Consent channel or status is invalid', 400);
    }
    await recordConsent(prisma, null, leadId, {
      channel,
      status,
      source: 'consent-webhook',
      legalBasis: typeof event.data.legalBasis === 'string' ? event.data.legalBasis : undefined,
      evidence: { externalEventId: event.id },
      occurredAt: typeof event.data.occurredAt === 'string'
        ? event.data.occurredAt
        : event.createdAt || new Date().toISOString(),
      syncOutbound: false,
    });
    return { ignored: false };
  }
  if (provider === 'suppression' && event.type === 'suppression.added') {
    return applySuppressionEvent(prisma, event);
  }
  return { ignored: true };
}

async function ingestProviderWebhook(prisma, provider, event) {
  let receipt;
  try {
    receipt = await prisma.providerWebhook.create({
      data: {
        provider,
        externalEventId: event.id,
        eventType: event.type,
        payload: event,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error;
    }
    const retry = await prisma.providerWebhook.updateMany({
      where: {
        provider,
        externalEventId: event.id,
        status: 'FAILED',
        attempts: { lt: 5 },
      },
      data: { status: 'RECEIVED', lastError: null },
    });
    if (retry.count !== 1) return { duplicate: true, eventId: event.id };
    receipt = await prisma.providerWebhook.findUniqueOrThrow({
      where: { provider_externalEventId: { provider, externalEventId: event.id } },
    });
  }
  try {
    const result = await applyEvent(prisma, provider, event);
    await prisma.providerWebhook.update({
      where: { id: receipt.id },
      data: {
        status: result.ignored ? 'IGNORED' : 'PROCESSED',
        attempts: { increment: 1 },
        processedAt: new Date(),
      },
    });
    return { duplicate: false, eventId: event.id, ...result };
  } catch (error) {
    await prisma.providerWebhook.update({
      where: { id: receipt.id },
      data: {
        status: 'FAILED',
        attempts: { increment: 1 },
        lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Webhook failed',
      },
    });
    throw error;
  }
}

module.exports = { ingestProviderWebhook };
