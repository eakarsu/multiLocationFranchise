const { createHash } = require('node:crypto');
const { Prisma } = require('@prisma/client');
const { DomainError } = require('./errors');
const {
  TRANSITIONS,
  normalizeEmail,
  normalizePhone,
  leadDedupeKey,
  accountDedupeKey,
  assertLeadTransition,
  assertExpectedVersion,
  contactValue,
  evaluateContactPolicy,
} = require('./policy');
const { createProviders, ProviderError } = require('./providers');

const CORPORATE_ROLES = new Set(['SUPER_ADMIN', 'CORPORATE_ADMIN']);
const MANAGER_ROLES = new Set([
  'SUPER_ADMIN',
  'CORPORATE_ADMIN',
  'REGIONAL_MANAGER',
  'LOCATION_MANAGER',
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function payloadHash(value) {
  return createHash('sha256').update(stableJson(value), 'utf8').digest('hex');
}

function actorCanAccessLead(actor, lead) {
  return CORPORATE_ROLES.has(actor.role) ||
    (actor.locationId && actor.locationId === lead.locationId) ||
    actor.id === lead.ownerId;
}

function assertLeadAccess(actor, lead) {
  if (!actorCanAccessLead(actor, lead)) {
    throw new DomainError('FORBIDDEN', 'Lead access denied', 403);
  }
}

function assertManager(actor) {
  if (!MANAGER_ROLES.has(actor.role)) {
    throw new DomainError('FORBIDDEN', 'Manager access required', 403);
  }
}

function assertLocationScope(actor, locationId) {
  if (!CORPORATE_ROLES.has(actor.role) && actor.locationId !== locationId) {
    throw new DomainError('FORBIDDEN', 'Location access denied', 403);
  }
}

function qualityScore(input) {
  const fields = [input.email, input.phone, input.firstName, input.lastName, input.companyName];
  return fields.reduce((score, value) => score + (value ? 20 : 0), 0);
}

async function queueCrmLead(tx, leadId, version, reason, discriminator = String(version)) {
  const idempotencyKey = `crm.lead.upsert:${leadId}:${reason}:${discriminator}`;
  await tx.revenueOutbox.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      topic: 'crm.lead.upsert',
      aggregateType: 'lead',
      aggregateId: leadId,
      idempotencyKey,
      payload: { leadId, version, reason },
    },
  });
}

async function getLeadForActor(prisma, actor, id) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      account: true,
      owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      policies: true,
      transitions: { orderBy: { createdAt: 'asc' } },
      outreaches: { orderBy: { createdAt: 'desc' }, take: 50 },
      attribution: { orderBy: { occurredAt: 'asc' } },
    },
  });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  assertLeadAccess(actor, lead);
  return lead;
}

async function listLeads(prisma, actor, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const where = {};
  if (!CORPORATE_ROLES.has(actor.role)) {
    if (actor.locationId) where.locationId = actor.locationId;
    else where.ownerId = actor.id;
  } else if (query.locationId) {
    where.locationId = query.locationId;
  }
  if (query.status) where.status = query.status;
  if (query.ownerId) where.ownerId = query.ownerId;
  if (query.search) {
    where.OR = ['email', 'firstName', 'lastName', 'companyName'].map((field) => ({
      [field]: { contains: query.search, mode: 'insensitive' },
    }));
  }
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        account: { select: { id: true, name: true, status: true } },
        policies: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);
  return { items, total, page, pages: Math.ceil(total / limit) };
}

async function createOrMergeLead(prisma, actor, input, options = {}) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const dedupeKey = leadDedupeKey(input);
  if (actor && input.locationId) assertLocationScope(actor, input.locationId);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.lead.findFirst({
      where: {
        OR: [
          { dedupeKey },
          ...(input.externalCrmId ? [{ externalCrmId: input.externalCrmId }] : []),
        ],
      },
    });
    const safeData = {
      externalCrmId: input.externalCrmId || undefined,
      locationId: input.locationId || undefined,
      email: normalizedEmail || undefined,
      normalizedEmail: normalizedEmail || undefined,
      phone: normalizedPhone || undefined,
      firstName: input.firstName?.trim() || undefined,
      lastName: input.lastName?.trim() || undefined,
      companyName: input.companyName?.trim() || undefined,
      countryCode: input.countryCode?.toUpperCase() || 'US',
      region: input.region?.toUpperCase() || undefined,
      source: input.source || options.provider || 'manual',
      attributionSource: input.attributionSource || input.source || options.provider || 'manual',
      attributionCampaign: input.attributionCampaign || undefined,
      qualityScore: qualityScore({ ...input, email: normalizedEmail, phone: normalizedPhone }),
    };
    let lead;
    if (existing) {
      if (actor) assertLeadAccess(actor, existing);
      lead = await tx.lead.update({
        where: { id: existing.id },
        data: {
          ...Object.fromEntries(Object.entries(safeData).filter(([, value]) => value !== undefined)),
          qualityScore: Math.max(existing.qualityScore || 0, safeData.qualityScore),
          version: { increment: 1 },
        },
      });
    } else {
      lead = await tx.lead.create({ data: { dedupeKey, ...safeData } });
      await tx.leadTransition.create({
        data: {
          leadId: lead.id,
          toStatus: 'NEW',
          actorId: actor?.id,
          reason: options.provider ? `Inbound ${options.provider} sync` : 'Lead created',
        },
      });
    }

    const attributionExternalId = input.attributionExternalId || input.externalCrmId || lead.dedupeKey;
    if (safeData.attributionSource) {
      await tx.attributionTouch.upsert({
        where: {
          dedupeKey: payloadHash(
            `${lead.id}:${safeData.attributionSource}:${safeData.attributionCampaign || ''}:${attributionExternalId}`,
          ),
        },
        update: {},
        create: {
          leadId: lead.id,
          dedupeKey: payloadHash(
            `${lead.id}:${safeData.attributionSource}:${safeData.attributionCampaign || ''}:${attributionExternalId}`,
          ),
          source: safeData.attributionSource,
          campaign: safeData.attributionCampaign,
          medium: input.attributionMedium,
          occurredAt: input.attributionOccurredAt ? new Date(input.attributionOccurredAt) : new Date(),
          metadata: input.attributionMetadata,
        },
      });
    }
    if (options.provider !== 'crm') await queueCrmLead(tx, lead.id, lead.version, 'lead-write');
    return lead;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function transitionLead(prisma, actor, leadId, toStatus, expectedVersion, reason, metadata) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  assertLeadAccess(actor, lead);
  assertExpectedVersion(lead.version, expectedVersion);
  assertLeadTransition(lead.status, toStatus);
  return prisma.$transaction(async (tx) => {
    const changed = await tx.lead.updateMany({
      where: { id: leadId, version: expectedVersion },
      data: {
        status: toStatus,
        version: { increment: 1 },
        ...(toStatus === 'CONVERTED' ? { convertedAt: new Date() } : {}),
      },
    });
    if (changed.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Lead changed');
    await tx.leadTransition.create({
      data: { leadId, fromStatus: lead.status, toStatus, actorId: actor.id, reason, metadata },
    });
    await queueCrmLead(tx, leadId, expectedVersion + 1, 'lifecycle');
    return tx.lead.findUniqueOrThrow({ where: { id: leadId } });
  });
}

async function assignOwner(prisma, actor, leadId, ownerId, expectedVersion, reason) {
  assertManager(actor);
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  assertLeadAccess(actor, lead);
  assertExpectedVersion(lead.version, expectedVersion);
  const owner = await prisma.user.findFirst({ where: { id: ownerId, isActive: true } });
  if (!owner) throw new DomainError('OWNER_NOT_FOUND', 'Active owner not found', 404);
  if (lead.locationId && !CORPORATE_ROLES.has(owner.role) && owner.locationId !== lead.locationId) {
    throw new DomainError('OWNER_LOCATION_MISMATCH', 'Owner is outside the lead location', 409);
  }
  return prisma.$transaction(async (tx) => {
    const changed = await tx.lead.updateMany({
      where: { id: leadId, version: expectedVersion },
      data: { ownerId, ownershipStatus: 'ASSIGNED', version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Lead changed');
    await tx.leadTransition.create({
      data: {
        leadId,
        fromStatus: lead.status,
        toStatus: lead.status,
        actorId: actor.id,
        reason: reason || 'Owner assigned',
        metadata: { ownerId },
      },
    });
    await queueCrmLead(tx, leadId, expectedVersion + 1, 'ownership-assigned');
    return tx.lead.findUniqueOrThrow({ where: { id: leadId } });
  });
}

async function acceptOwnership(prisma, actor, leadId, expectedVersion) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  if (lead.ownerId !== actor.id) throw new DomainError('FORBIDDEN', 'Only the assigned owner can accept', 403);
  assertExpectedVersion(lead.version, expectedVersion);
  if (lead.ownershipStatus !== 'ASSIGNED') {
    throw new DomainError('OWNERSHIP_NOT_ASSIGNABLE', 'Ownership is not awaiting acceptance');
  }
  return prisma.$transaction(async (tx) => {
    const changed = await tx.lead.updateMany({
      where: { id: leadId, version: expectedVersion, ownershipStatus: 'ASSIGNED' },
      data: { ownershipStatus: 'ACCEPTED', version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Lead changed');
    await tx.leadTransition.create({
      data: {
        leadId,
        fromStatus: lead.status,
        toStatus: lead.status,
        actorId: actor.id,
        reason: 'Ownership accepted',
      },
    });
    await queueCrmLead(tx, leadId, expectedVersion + 1, 'ownership-accepted');
    return tx.lead.findUniqueOrThrow({ where: { id: leadId } });
  });
}

async function submitForApproval(prisma, actor, leadId, expectedVersion, reason) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  if (lead.ownerId !== actor.id || lead.ownershipStatus !== 'ACCEPTED') {
    throw new DomainError('FORBIDDEN', 'The accepted owner must submit approval', 403);
  }
  assertExpectedVersion(lead.version, expectedVersion);
  assertLeadTransition(lead.status, 'PENDING_APPROVAL');
  return prisma.$transaction(async (tx) => {
    const changed = await tx.lead.updateMany({
      where: { id: leadId, version: expectedVersion },
      data: {
        status: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING',
        version: { increment: 1 },
      },
    });
    if (changed.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Lead changed');
    await tx.leadTransition.create({
      data: {
        leadId,
        fromStatus: lead.status,
        toStatus: 'PENDING_APPROVAL',
        actorId: actor.id,
        reason: reason || 'Submitted for approval',
      },
    });
    await queueCrmLead(tx, leadId, expectedVersion + 1, 'approval-submitted');
    return tx.lead.findUniqueOrThrow({ where: { id: leadId } });
  });
}

async function decideApproval(prisma, actor, leadId, expectedVersion, decision, reason) {
  assertManager(actor);
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  assertLeadAccess(actor, lead);
  if (lead.ownerId === actor.id) {
    throw new DomainError('SEPARATION_OF_DUTIES', 'Lead owners cannot approve their own submission', 403);
  }
  if (lead.approvalStatus !== 'PENDING') {
    throw new DomainError('APPROVAL_NOT_PENDING', 'Lead is not awaiting approval');
  }
  const toStatus = decision === 'APPROVED' ? 'APPROVED' : 'DISQUALIFIED';
  assertExpectedVersion(lead.version, expectedVersion);
  assertLeadTransition(lead.status, toStatus);
  return prisma.$transaction(async (tx) => {
    const changed = await tx.lead.updateMany({
      where: { id: leadId, version: expectedVersion, approvalStatus: 'PENDING' },
      data: { status: toStatus, approvalStatus: decision, version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Lead changed');
    await tx.leadTransition.create({
      data: {
        leadId,
        fromStatus: lead.status,
        toStatus,
        actorId: actor.id,
        reason: reason || `Approval ${decision.toLowerCase()}`,
      },
    });
    await queueCrmLead(tx, leadId, expectedVersion + 1, 'approval-decided');
    return tx.lead.findUniqueOrThrow({ where: { id: leadId } });
  });
}

async function handoffLead(prisma, actor, leadId, expectedVersion, input = {}) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  assertLeadAccess(actor, lead);
  if (lead.ownerId !== actor.id && !MANAGER_ROLES.has(actor.role)) {
    throw new DomainError('FORBIDDEN', 'Owner or manager access required', 403);
  }
  if (lead.approvalStatus !== 'APPROVED' || lead.ownershipStatus !== 'ACCEPTED') {
    throw new DomainError('HANDOFF_NOT_READY', 'Approved lead and accepted ownership are required');
  }
  if (!['APPROVED', 'CONTACTED', 'NURTURING'].includes(lead.status)) {
    throw new DomainError('HANDOFF_NOT_READY', 'Lead lifecycle is not ready for handoff');
  }
  assertExpectedVersion(lead.version, expectedVersion);
  assertLeadTransition(lead.status, 'HANDED_OFF');
  return prisma.$transaction(async (tx) => {
    const changed = await tx.lead.updateMany({
      where: { id: leadId, version: expectedVersion },
      data: {
        status: 'HANDED_OFF',
        handoffStatus: 'IN_PROGRESS',
        version: { increment: 1 },
      },
    });
    if (changed.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Lead changed');
    await tx.leadTransition.create({
      data: {
        leadId,
        fromStatus: lead.status,
        toStatus: 'HANDED_OFF',
        actorId: actor.id,
        reason: input.reason || 'Lead handed off',
      },
    });
    await tx.revenueOutbox.createMany({
      data: [
        {
          topic: 'calendar.handoff.create',
          aggregateType: 'lead',
          aggregateId: leadId,
          idempotencyKey: `calendar.handoff.create:${leadId}:${expectedVersion + 1}`,
          payload: { leadId, startsAt: input.startsAt, notes: input.notes },
        },
        {
          topic: 'crm.lead.upsert',
          aggregateType: 'lead',
          aggregateId: leadId,
          idempotencyKey: `crm.handoff:${leadId}:${expectedVersion + 1}`,
          payload: { leadId },
        },
      ],
      skipDuplicates: true,
    });
    return tx.lead.findUniqueOrThrow({ where: { id: leadId } });
  });
}

async function convertLead(prisma, actor, leadId, expectedVersion, accountInput) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  assertLeadAccess(actor, lead);
  if (!['HANDED_OFF', 'CONTACTED', 'NURTURING'].includes(lead.status)) {
    throw new DomainError('CONVERSION_NOT_ALLOWED', 'Lead must be contacted or handed off first');
  }
  const dedupeKey = accountDedupeKey(accountInput);
  return prisma.$transaction(async (tx) => {
    assertExpectedVersion(lead.version, expectedVersion);
    const account = await tx.account.upsert({
      where: { dedupeKey },
      update: {
        name: accountInput.name,
        domain: accountInput.domain,
        ownerId: lead.ownerId,
        status: 'ACTIVE',
        version: { increment: 1 },
      },
      create: {
        dedupeKey,
        externalCrmId: accountInput.externalCrmId,
        name: accountInput.name,
        domain: accountInput.domain,
        countryCode: lead.countryCode,
        region: lead.region,
        status: 'ACTIVE',
        ownerId: lead.ownerId,
        attributionSource: lead.attributionSource,
        attributionCampaign: lead.attributionCampaign,
      },
    });
    const changed = await tx.lead.updateMany({
      where: { id: leadId, version: expectedVersion },
      data: {
        accountId: account.id,
        status: 'CONVERTED',
        handoffStatus: 'COMPLETED',
        convertedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (changed.count !== 1) throw new DomainError('VERSION_CONFLICT', 'Lead changed');
    await tx.leadTransition.create({
      data: {
        leadId,
        fromStatus: lead.status,
        toStatus: 'CONVERTED',
        actorId: actor.id,
        reason: 'Converted to account',
        metadata: { accountId: account.id },
      },
    });
    await tx.revenueOutbox.create({
      data: {
        topic: 'crm.lead.upsert',
        aggregateType: 'lead',
        aggregateId: leadId,
        idempotencyKey: `crm.convert:${leadId}:${expectedVersion + 1}`,
        payload: { leadId, accountId: account.id },
      },
    });
    return { lead: await tx.lead.findUniqueOrThrow({ where: { id: leadId } }), account };
  });
}

async function recordConsent(prisma, actor, leadId, input) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  if (actor) assertLeadAccess(actor, lead);
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime()) || occurredAt > new Date(Date.now() + 5 * 60_000)) {
    throw new DomainError('INVALID_CONSENT_TIME', 'Consent timestamp is invalid', 400);
  }
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= occurredAt)) {
    throw new DomainError('INVALID_CONSENT_EXPIRY', 'Consent expiry must be after occurrence', 400);
  }
  const value = contactValue(input.channel, lead);
  if (!value) throw new DomainError('CONTACT_DESTINATION_REQUIRED', 'Lead destination is missing', 400);
  return prisma.$transaction(async (tx) => {
    await tx.consentEvent.create({
      data: {
        leadId,
        channel: input.channel,
        status: input.status,
        source: input.source,
        legalBasis: input.legalBasis,
        evidence: input.evidence,
        recordedById: actor?.id,
        occurredAt,
      },
    });
    const current = await tx.contactPolicy.findUnique({
      where: { leadId_channel: { leadId, channel: input.channel } },
    });
    if (!current || current.recordedAt <= occurredAt) {
      await tx.contactPolicy.upsert({
        where: { leadId_channel: { leadId, channel: input.channel } },
        update: {
          consentStatus: input.status,
          legalBasis: input.legalBasis,
          region: lead.region,
          doNotContact: input.status === 'OPTED_OUT',
          source: input.source,
          recordedAt: occurredAt,
          expiresAt,
        },
        create: {
          leadId,
          channel: input.channel,
          consentStatus: input.status,
          legalBasis: input.legalBasis,
          region: lead.region,
          doNotContact: input.status === 'OPTED_OUT',
          source: input.source,
          recordedAt: occurredAt,
          expiresAt,
        },
      });
    }
    if (input.status === 'OPTED_OUT') {
      await tx.suppressionEntry.upsert({
        where: { channel_normalizedValue: { channel: input.channel, normalizedValue: value } },
        update: { active: true, reason: 'OPT_OUT', source: input.source, expiresAt: null },
        create: {
          channel: input.channel,
          normalizedValue: value,
          reason: 'OPT_OUT',
          source: input.source,
        },
      });
      if (TRANSITIONS[lead.status]?.includes('SUPPRESSED')) {
        await tx.lead.update({
          where: { id: leadId },
          data: { status: 'SUPPRESSED', version: { increment: 1 } },
        });
        await tx.leadTransition.create({
          data: {
            leadId,
            fromStatus: lead.status,
            toStatus: 'SUPPRESSED',
            actorId: actor?.id,
            reason: `${input.channel} opt-out`,
          },
        });
      }
    } else if (input.status === 'OPTED_IN') {
      await tx.suppressionEntry.updateMany({
        where: {
          channel: input.channel,
          normalizedValue: value,
          reason: 'OPT_OUT',
        },
        data: { active: false },
      });
    }
    if (input.syncOutbound !== false) await tx.revenueOutbox.createMany({
      data: [
        {
          topic: 'consent.sync',
          aggregateType: 'lead',
          aggregateId: leadId,
          idempotencyKey: `consent.sync:${leadId}:${input.channel}:${occurredAt.toISOString()}`,
          payload: { leadId, channel: input.channel },
        },
        ...(input.status === 'OPTED_OUT' ? [{
          topic: 'suppression.sync',
          aggregateType: 'lead',
          aggregateId: leadId,
          idempotencyKey: `suppression.sync:${leadId}:${input.channel}:${occurredAt.toISOString()}`,
          payload: { leadId, channel: input.channel, normalizedValue: value, reason: 'OPT_OUT' },
        }] : []),
      ],
      skipDuplicates: true,
    });
    await queueCrmLead(
      tx,
      leadId,
      lead.version + (input.status === 'OPTED_OUT' && TRANSITIONS[lead.status]?.includes('SUPPRESSED') ? 1 : 0),
      'consent',
      `${input.channel}:${occurredAt.toISOString()}`,
    );
    return tx.contactPolicy.findUniqueOrThrow({
      where: { leadId_channel: { leadId, channel: input.channel } },
    });
  });
}

async function evaluateLeadContact(prisma, lead, channel) {
  const destination = contactValue(channel, lead);
  const [policy, suppression, sentWithin24Hours, locationSentToday] = await Promise.all([
    prisma.contactPolicy.findUnique({ where: { leadId_channel: { leadId: lead.id, channel } } }),
    destination ? prisma.suppressionEntry.findUnique({
      where: { channel_normalizedValue: { channel, normalizedValue: destination } },
    }) : null,
    prisma.outreach.count({
      where: {
        leadId: lead.id,
        status: { in: ['SENT', 'DELIVERED'] },
        sentAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
      },
    }),
    lead.locationId ? prisma.outreach.count({
      where: {
        lead: { locationId: lead.locationId },
        status: { in: ['SENT', 'DELIVERED'] },
        sentAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) },
      },
    }) : 0,
  ]);
  return evaluateContactPolicy({
    channel,
    lead,
    policy,
    suppression,
    sentWithin24Hours,
    locationSentToday,
    locationDailyLimit: Math.max(1, Number(process.env.OUTREACH_DAILY_LIMIT) || 100),
  });
}

async function requestOutreach(prisma, actor, leadId, input) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  assertLeadAccess(actor, lead);
  if (!['APPROVED', 'CONTACTED', 'NURTURING', 'HANDED_OFF'].includes(lead.status)) {
    throw new DomainError('OUTREACH_NOT_ALLOWED', 'Lead is not approved for outreach');
  }
  const existing = await prisma.outreach.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    const requestedAt = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null;
    if (existing.leadId !== leadId || existing.channel !== input.channel ||
      existing.subject !== (input.subject || null) || existing.body !== input.body ||
      existing.scheduledAt?.toISOString() !== requestedAt) {
      throw new DomainError('IDEMPOTENCY_CONFLICT', 'Idempotency key belongs to another outreach');
    }
    return existing;
  }
  const policy = await evaluateLeadContact(prisma, lead, input.channel);
  return prisma.outreach.create({
    data: {
      leadId,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      idempotencyKey: input.idempotencyKey,
      requestedById: actor.id,
      requiresReview: true,
      policySnapshot: policy,
      status: policy.allowed ? 'PENDING_REVIEW' : 'SUPPRESSED',
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      lastError: policy.allowed ? null : policy.reasons.join('; ').slice(0, 1000),
    },
  });
}

async function reviewOutreach(prisma, actor, outreachId, decision, reason) {
  assertManager(actor);
  const outreach = await prisma.outreach.findUnique({
    where: { id: outreachId },
    include: { lead: true },
  });
  if (!outreach) throw new DomainError('OUTREACH_NOT_FOUND', 'Outreach not found', 404);
  assertLeadAccess(actor, outreach.lead);
  if (outreach.requestedById === actor.id) {
    throw new DomainError('SEPARATION_OF_DUTIES', 'Requester cannot review their own outreach', 403);
  }
  if (outreach.status !== 'PENDING_REVIEW') {
    throw new DomainError('OUTREACH_NOT_PENDING', 'Outreach is not awaiting review');
  }
  if (decision === 'REJECTED') {
    const changed = await prisma.outreach.updateMany({
      where: { id: outreachId, status: 'PENDING_REVIEW' },
      data: { status: 'REJECTED', approvedById: actor.id, lastError: reason || 'Rejected' },
    });
    if (changed.count !== 1) throw new DomainError('OUTREACH_NOT_PENDING', 'Outreach changed');
    return prisma.outreach.findUniqueOrThrow({ where: { id: outreachId } });
  }
  const policy = await evaluateLeadContact(prisma, outreach.lead, outreach.channel);
  if (!policy.allowed) {
    const changed = await prisma.outreach.updateMany({
      where: { id: outreachId, status: 'PENDING_REVIEW' },
      data: {
        status: 'SUPPRESSED',
        approvedById: actor.id,
        policySnapshot: policy,
        lastError: policy.reasons.join('; ').slice(0, 1000),
      },
    });
    if (changed.count !== 1) throw new DomainError('OUTREACH_NOT_PENDING', 'Outreach changed');
    return prisma.outreach.findUniqueOrThrow({ where: { id: outreachId } });
  }
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.outreach.updateMany({
      where: { id: outreachId, status: 'PENDING_REVIEW' },
      data: {
        status: 'QUEUED',
        approvedById: actor.id,
        approvedAt: new Date(),
        policySnapshot: policy,
        lastError: null,
      },
    });
    if (claimed.count !== 1) throw new DomainError('OUTREACH_NOT_PENDING', 'Outreach changed');
    const updated = await tx.outreach.findUniqueOrThrow({ where: { id: outreachId } });
    await tx.revenueOutbox.create({
      data: {
        topic: 'outreach.send',
        aggregateType: 'outreach',
        aggregateId: outreachId,
        idempotencyKey: `outreach.send:${outreachId}`,
        payload: { outreachId },
        availableAt: updated.scheduledAt || new Date(),
      },
    });
    return updated;
  });
}

async function ingestLeadSyncRecord(prisma, provider, record) {
  if (!record || typeof record.id !== 'string' || record.id.length === 0) {
    throw new DomainError('INVALID_SYNC_RECORD', 'Stable external record id is required', 400);
  }
  const idempotencyKey = `${provider}:inbound:lead:${record.id}`;
  const hash = payloadHash(record);
  const existing = await prisma.syncEvent.findUnique({ where: { idempotencyKey } });
  if (existing && existing.payloadHash !== hash) {
    throw new DomainError('SYNC_ID_REUSE', 'External record id was reused with different data');
  }
  if (existing?.status === 'SUCCEEDED') return { duplicate: true, leadId: existing.payload.leadId };
  const event = existing ? await prisma.syncEvent.update({
    where: { id: existing.id },
    data: { status: 'PROCESSING', attempts: { increment: 1 }, lastError: null },
  }) : await prisma.syncEvent.create({
    data: {
      provider,
      direction: 'INBOUND',
      resourceType: 'lead',
      externalId: record.id,
      idempotencyKey,
      payloadHash: hash,
      payload: record,
      status: 'PROCESSING',
      attempts: 1,
    },
  });
  try {
    const lead = await createOrMergeLead(prisma, null, {
      ...record,
      externalCrmId: record.externalCrmId || (provider === 'crm' ? record.id : undefined),
      source: record.source || provider,
      attributionExternalId: record.id,
    }, { provider });
    await prisma.syncEvent.update({
      where: { id: event.id },
      data: {
        status: 'SUCCEEDED',
        payload: { ...record, leadId: lead.id },
        processedAt: new Date(),
      },
    });
    return { duplicate: false, leadId: lead.id };
  } catch (error) {
    await prisma.syncEvent.update({
      where: { id: event.id },
      data: {
        status: event.attempts >= 5 ? 'DEAD_LETTER' : 'FAILED',
        lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Sync failed',
      },
    });
    throw error;
  }
}

async function claimInboundSync(prisma, provider, resourceType, record) {
  if (!record || typeof record.id !== 'string' || record.id.length === 0 || record.id.length > 500) {
    throw new DomainError('INVALID_SYNC_RECORD', 'Stable external record id is required', 400);
  }
  const idempotencyKey = `${provider}:inbound:${resourceType}:${record.id}`;
  const hash = payloadHash(record);
  const existing = await prisma.syncEvent.findUnique({ where: { idempotencyKey } });
  if (existing && existing.payloadHash !== hash) {
    throw new DomainError('SYNC_ID_REUSE', 'External record id was reused with different data');
  }
  if (existing?.status === 'SUCCEEDED') return { duplicate: true, event: existing };
  const event = existing ? await prisma.syncEvent.update({
    where: { id: existing.id },
    data: { status: 'PROCESSING', attempts: { increment: 1 }, lastError: null },
  }) : await prisma.syncEvent.create({
    data: {
      provider,
      direction: 'INBOUND',
      resourceType,
      externalId: record.id,
      idempotencyKey,
      payloadHash: hash,
      payload: record,
      status: 'PROCESSING',
      attempts: 1,
    },
  });
  return { duplicate: false, event };
}

async function completeInboundSync(prisma, event, payload) {
  await prisma.syncEvent.update({
    where: { id: event.id },
    data: { status: 'SUCCEEDED', payload, processedAt: new Date(), lastError: null },
  });
}

async function failInboundSync(prisma, event, error) {
  await prisma.syncEvent.update({
    where: { id: event.id },
    data: {
      status: event.attempts >= 5 ? 'DEAD_LETTER' : 'FAILED',
      lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Sync failed',
    },
  });
}

async function resolveInboundLead(prisma, record, channel) {
  if (typeof record.leadId === 'string') {
    const lead = await prisma.lead.findUnique({ where: { id: record.leadId } });
    if (lead) return lead;
  }
  if (typeof record.externalCrmId === 'string') {
    const lead = await prisma.lead.findUnique({ where: { externalCrmId: record.externalCrmId } });
    if (lead) return lead;
  }
  const raw = record.destination || record.value || (channel === 'EMAIL' ? record.email : record.phone);
  const normalized = channel === 'EMAIL' ? normalizeEmail(raw) : normalizePhone(raw);
  if (!normalized) return null;
  return prisma.lead.findFirst({
    where: channel === 'EMAIL' ? { normalizedEmail: normalized } : { phone: normalized },
  });
}

async function ingestConsentSyncRecord(prisma, provider, record) {
  const claim = await claimInboundSync(prisma, provider, 'consent', record);
  if (claim.duplicate) return { duplicate: true, eventId: claim.event.id };
  try {
    const channel = String(record.channel || '').toUpperCase();
    const status = String(record.status || '').toUpperCase();
    if (!['EMAIL', 'SMS'].includes(channel) || !['UNKNOWN', 'OPTED_IN', 'OPTED_OUT'].includes(status)) {
      throw new DomainError('INVALID_SYNC_RECORD', 'Consent channel or status is invalid', 400);
    }
    const lead = await resolveInboundLead(prisma, record, channel);
    if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Consent record does not match a lead', 404);
    const policy = await recordConsent(prisma, null, lead.id, {
      channel,
      status,
      source: provider,
      legalBasis: typeof record.legalBasis === 'string' ? record.legalBasis : undefined,
      evidence: { externalRecordId: record.id },
      occurredAt: record.occurredAt || new Date().toISOString(),
      expiresAt: record.expiresAt,
      syncOutbound: false,
    });
    await completeInboundSync(prisma, claim.event, { ...record, leadId: lead.id });
    return { duplicate: false, leadId: lead.id, policyId: policy.id };
  } catch (error) {
    await failInboundSync(prisma, claim.event, error);
    throw error;
  }
}

async function ingestSuppressionSyncRecord(prisma, provider, record) {
  const claim = await claimInboundSync(prisma, provider, 'suppression', record);
  if (claim.duplicate) return { duplicate: true, eventId: claim.event.id };
  try {
    const channel = String(record.channel || '').toUpperCase();
    if (!['EMAIL', 'SMS'].includes(channel)) {
      throw new DomainError('INVALID_SYNC_RECORD', 'Suppression channel is invalid', 400);
    }
    const rawValue = record.destination || record.value;
    const normalizedValue = channel === 'EMAIL' ? normalizeEmail(rawValue) : normalizePhone(rawValue);
    if (!normalizedValue) throw new DomainError('INVALID_SYNC_RECORD', 'Suppression destination is invalid', 400);
    const allowedReasons = ['OPT_OUT', 'HARD_BOUNCE', 'COMPLAINT', 'LEGAL', 'MANUAL'];
    const reason = allowedReasons.includes(record.reason) ? record.reason : 'MANUAL';
    const lead = await resolveInboundLead(prisma, { ...record, value: normalizedValue }, channel);
    await prisma.$transaction(async (tx) => {
      await tx.suppressionEntry.upsert({
        where: { channel_normalizedValue: { channel, normalizedValue } },
        update: { active: record.active !== false, reason, source: provider, expiresAt: null },
        create: { channel, normalizedValue, active: record.active !== false, reason, source: provider },
      });
      if (record.active !== false && lead && TRANSITIONS[lead.status]?.includes('SUPPRESSED')) {
        const changed = await tx.lead.updateMany({
          where: { id: lead.id, version: lead.version, status: lead.status },
          data: { status: 'SUPPRESSED', version: { increment: 1 } },
        });
        if (changed.count === 1) await tx.leadTransition.create({
          data: {
            leadId: lead.id,
            fromStatus: lead.status,
            toStatus: 'SUPPRESSED',
            reason: `Inbound ${provider} suppression`,
            metadata: { externalRecordId: record.id, channel, reason },
          },
        });
        if (changed.count === 1) await queueCrmLead(
          tx,
          lead.id,
          lead.version + 1,
          'inbound-suppression',
          record.id,
        );
      }
    });
    await completeInboundSync(prisma, claim.event, {
      ...record,
      normalizedValue,
      ...(lead ? { leadId: lead.id } : {}),
    });
    return { duplicate: false, leadId: lead?.id || null, normalizedValue };
  } catch (error) {
    await failInboundSync(prisma, claim.event, error);
    throw error;
  }
}

async function pullProviderSync(prisma, providerName, resourceType = 'lead') {
  const providers = createProviders();
  const cursor = await prisma.syncCursor.findUnique({
    where: { provider_resourceType: { provider: providerName, resourceType } },
  });
  let page;
  if (providerName === 'crm' && resourceType === 'lead') {
    page = await providers.crm.pullLeads({
      cursor: cursor?.cursor,
      idempotencyKey: `crm.pull:${cursor?.cursor || 'initial'}`,
    });
  } else if (providerName === 'consent' && resourceType === 'consent') {
    page = await providers.consent.pullChanges({
      cursor: cursor?.cursor,
      idempotencyKey: `consent.pull:${cursor?.cursor || 'initial'}`,
    });
  } else if (providerName === 'suppression' && resourceType === 'suppression') {
    page = await providers.suppression.pullChanges({
      cursor: cursor?.cursor,
      idempotencyKey: `suppression.pull:${cursor?.cursor || 'initial'}`,
    });
  } else {
    throw new DomainError('SYNC_NOT_SUPPORTED', 'Provider sync resource is not supported', 400);
  }
  const results = [];
  for (const record of page.records) {
    if (resourceType === 'lead') results.push(await ingestLeadSyncRecord(prisma, providerName, record));
    else if (resourceType === 'consent') results.push(await ingestConsentSyncRecord(prisma, providerName, record));
    else results.push(await ingestSuppressionSyncRecord(prisma, providerName, record));
  }
  await prisma.syncCursor.upsert({
    where: { provider_resourceType: { provider: providerName, resourceType } },
    update: { cursor: page.nextCursor, syncedAt: new Date() },
    create: {
      provider: providerName,
      resourceType,
      cursor: page.nextCursor,
      syncedAt: new Date(),
    },
  });
  return { processed: results.length, nextCursor: page.nextCursor, results };
}

async function enrichLead(prisma, actor, leadId, idempotencyKey) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new DomainError('LEAD_NOT_FOUND', 'Lead not found', 404);
  assertLeadAccess(actor, lead);
  const providers = createProviders();
  let result;
  try {
    result = await providers.enrichment.enrichLead(
      { email: lead.email, phone: lead.phone, companyName: lead.companyName },
      idempotencyKey,
    );
  } catch (error) {
    if (error instanceof ProviderError) {
      throw new DomainError(`ENRICHMENT_${error.code}`, error.message, error.retryable ? 502 : 503);
    }
    throw error;
  }
  return prisma.$transaction(async (tx) => {
    const record = await tx.enrichmentRecord.upsert({
      where: {
        provider_externalId: {
          provider: providers.enrichment.name,
          externalId: result.providerReference,
        },
      },
      update: {},
      create: {
        leadId,
        provider: providers.enrichment.name,
        externalId: result.providerReference,
        payloadHash: payloadHash(result.data),
        data: result.data,
        qualityScore: result.qualityScore,
        appliedAt: new Date(),
      },
    });
    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        companyName: lead.companyName || result.data.companyName || undefined,
        countryCode: result.data.countryCode || lead.countryCode,
        region: result.data.region || lead.region,
        qualityScore: Math.max(lead.qualityScore || 0, result.qualityScore || 0),
        version: { increment: 1 },
      },
    });
    await queueCrmLead(tx, leadId, updatedLead.version, 'enrichment', result.providerReference);
    return record;
  });
}

async function conversionMetrics(prisma, actor) {
  const scope = CORPORATE_ROLES.has(actor.role) ? {} : actor.locationId
    ? { locationId: actor.locationId }
    : { ownerId: actor.id };
  const [total, converted, suppressed, unassigned, missingEmail, quality] = await Promise.all([
    prisma.lead.count({ where: scope }),
    prisma.lead.count({ where: { ...scope, status: 'CONVERTED' } }),
    prisma.lead.count({ where: { ...scope, status: 'SUPPRESSED' } }),
    prisma.lead.count({ where: { ...scope, ownershipStatus: 'UNASSIGNED' } }),
    prisma.lead.count({ where: { ...scope, normalizedEmail: null } }),
    prisma.lead.aggregate({ where: scope, _avg: { qualityScore: true } }),
  ]);
  return {
    total,
    converted,
    conversionRate: total ? Number(((converted / total) * 100).toFixed(2)) : 0,
    suppressed,
    unassigned,
    missingEmail,
    averageQualityScore: Number((quality._avg.qualityScore || 0).toFixed(2)),
  };
}

module.exports = {
  CORPORATE_ROLES,
  MANAGER_ROLES,
  actorCanAccessLead,
  queueCrmLead,
  getLeadForActor,
  listLeads,
  createOrMergeLead,
  transitionLead,
  assignOwner,
  acceptOwnership,
  submitForApproval,
  decideApproval,
  handoffLead,
  convertLead,
  recordConsent,
  requestOutreach,
  reviewOutreach,
  evaluateLeadContact,
  ingestLeadSyncRecord,
  ingestConsentSyncRecord,
  ingestSuppressionSyncRecord,
  pullProviderSync,
  enrichLead,
  conversionMetrics,
};
