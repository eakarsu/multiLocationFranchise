const express = require('express');
const { z } = require('zod');
const { authenticateToken, isCorporate, isManager } = require('../middleware/auth');
const { errorResponse, DomainError } = require('../revenue/errors');
const {
  listLeads,
  getLeadForActor,
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
  ingestLeadSyncRecord,
  pullProviderSync,
  enrichLead,
  conversionMetrics,
} = require('../revenue/service');

const router = express.Router();
router.use(authenticateToken);

const optionalText = (max) => z.string().trim().min(1).max(max).optional();
const leadSchema = z.object({
  externalCrmId: optionalText(500),
  locationId: z.string().uuid().optional(),
  email: z.string().email().max(320).optional(),
  phone: optionalText(50),
  firstName: optionalText(200),
  lastName: optionalText(200),
  companyName: optionalText(300),
  countryCode: z.string().trim().length(2).default('US'),
  region: optionalText(20),
  source: z.string().trim().min(1).max(200).default('manual'),
  attributionSource: optionalText(200),
  attributionCampaign: optionalText(200),
  attributionMedium: optionalText(100),
  attributionExternalId: optionalText(500),
  attributionOccurredAt: z.string().datetime().optional(),
  attributionMetadata: z.record(z.string(), z.unknown()).optional(),
}).refine((value) => value.email || value.phone || value.externalCrmId, {
  message: 'email, phone, or externalCrmId is required',
});

const commandSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('transition'),
    expectedVersion: z.number().int().positive(),
    toStatus: z.enum([
      'QUALIFIED', 'DISQUALIFIED', 'CONTACTED', 'NURTURING', 'LOST', 'SUPPRESSED',
    ]),
    reason: optionalText(1000),
  }),
  z.object({
    action: z.literal('assign-owner'),
    expectedVersion: z.number().int().positive(),
    ownerId: z.string().uuid(),
    reason: optionalText(1000),
  }),
  z.object({
    action: z.literal('accept-ownership'),
    expectedVersion: z.number().int().positive(),
  }),
  z.object({
    action: z.literal('submit-approval'),
    expectedVersion: z.number().int().positive(),
    reason: optionalText(1000),
  }),
  z.object({
    action: z.literal('decide-approval'),
    expectedVersion: z.number().int().positive(),
    decision: z.enum(['APPROVED', 'REJECTED']),
    reason: optionalText(1000),
  }),
  z.object({
    action: z.literal('handoff'),
    expectedVersion: z.number().int().positive(),
    startsAt: z.string().datetime().optional(),
    notes: optionalText(2000),
    reason: optionalText(1000),
  }),
  z.object({
    action: z.literal('convert'),
    expectedVersion: z.number().int().positive(),
    account: z.object({
      name: z.string().trim().min(1).max(300),
      domain: optionalText(300),
      externalCrmId: optionalText(500),
    }),
  }),
  z.object({
    action: z.literal('record-consent'),
    channel: z.enum(['EMAIL', 'SMS']),
    status: z.enum(['UNKNOWN', 'OPTED_IN', 'OPTED_OUT']),
    source: z.string().trim().min(1).max(200),
    legalBasis: optionalText(200),
    evidence: z.record(z.string(), z.unknown()).optional(),
    occurredAt: z.string().datetime(),
    expiresAt: z.string().datetime().optional(),
  }),
  z.object({ action: z.literal('enrich') }),
]);

const outreachSchema = z.object({
  channel: z.enum(['EMAIL', 'SMS']),
  subject: optionalText(300),
  body: z.string().trim().min(1).max(50_000),
  scheduledAt: z.string().datetime().optional(),
});

function actor(req) {
  return {
    id: req.user.id,
    role: req.user.role,
    locationId: req.user.locationId,
  };
}

function parse(schema, value, res) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: parsed.error.flatten(),
    });
    return null;
  }
  return parsed.data;
}

function handle(error, res) {
  console.error('Revenue workflow error:', error?.message || error);
  const response = errorResponse(error);
  res.status(response.status).json(response.body);
}

router.get('/leads', async (req, res) => {
  try {
    res.json(await listLeads(req.prisma, actor(req), req.query));
  } catch (error) {
    handle(error, res);
  }
});

router.post('/leads', async (req, res) => {
  const input = parse(leadSchema, req.body, res);
  if (!input) return;
  try {
    res.status(201).json(await createOrMergeLead(req.prisma, actor(req), input));
  } catch (error) {
    handle(error, res);
  }
});

router.get('/leads/:id', async (req, res) => {
  try {
    res.json(await getLeadForActor(req.prisma, actor(req), req.params.id));
  } catch (error) {
    handle(error, res);
  }
});

router.post('/leads/:id/commands', async (req, res) => {
  const input = parse(commandSchema, req.body, res);
  if (!input) return;
  try {
    let result;
    switch (input.action) {
      case 'transition':
        result = await transitionLead(
          req.prisma,
          actor(req),
          req.params.id,
          input.toStatus,
          input.expectedVersion,
          input.reason,
        );
        break;
      case 'assign-owner':
        result = await assignOwner(
          req.prisma,
          actor(req),
          req.params.id,
          input.ownerId,
          input.expectedVersion,
          input.reason,
        );
        break;
      case 'accept-ownership':
        result = await acceptOwnership(
          req.prisma,
          actor(req),
          req.params.id,
          input.expectedVersion,
        );
        break;
      case 'submit-approval':
        result = await submitForApproval(
          req.prisma,
          actor(req),
          req.params.id,
          input.expectedVersion,
          input.reason,
        );
        break;
      case 'decide-approval':
        result = await decideApproval(
          req.prisma,
          actor(req),
          req.params.id,
          input.expectedVersion,
          input.decision,
          input.reason,
        );
        break;
      case 'handoff':
        result = await handoffLead(
          req.prisma,
          actor(req),
          req.params.id,
          input.expectedVersion,
          input,
        );
        break;
      case 'convert':
        result = await convertLead(
          req.prisma,
          actor(req),
          req.params.id,
          input.expectedVersion,
          input.account,
        );
        break;
      case 'record-consent':
        result = await recordConsent(req.prisma, actor(req), req.params.id, input);
        break;
      case 'enrich': {
        const idempotencyKey = req.get('idempotency-key');
        if (!idempotencyKey) {
          throw new DomainError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required', 400);
        }
        result = await enrichLead(req.prisma, actor(req), req.params.id, idempotencyKey);
        break;
      }
      default:
        throw new DomainError('INVALID_COMMAND', 'Unsupported command', 400);
    }
    res.json(result);
  } catch (error) {
    handle(error, res);
  }
});

router.post('/leads/:id/outreach', async (req, res) => {
  const input = parse(outreachSchema, req.body, res);
  if (!input) return;
  const idempotencyKey = req.get('idempotency-key');
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return res.status(400).json({
      error: 'A valid Idempotency-Key header is required',
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    });
  }
  try {
    res.status(201).json(await requestOutreach(req.prisma, actor(req), req.params.id, {
      ...input,
      idempotencyKey,
    }));
  } catch (error) {
    handle(error, res);
  }
});

router.post('/outreach/:id/review', isManager, async (req, res) => {
  const input = parse(z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    reason: optionalText(1000),
  }), req.body, res);
  if (!input) return;
  try {
    res.json(await reviewOutreach(req.prisma, actor(req), req.params.id, input.decision, input.reason));
  } catch (error) {
    handle(error, res);
  }
});

router.post('/sync/:provider/records', isCorporate, async (req, res) => {
  const input = parse(z.object({ records: z.array(z.record(z.string(), z.unknown())).min(1).max(1000) }), req.body, res);
  if (!input) return;
  if (req.params.provider !== 'crm') {
    return res.status(400).json({ error: 'Only CRM lead records are accepted here' });
  }
  try {
    const results = [];
    for (const record of input.records) {
      results.push(await ingestLeadSyncRecord(req.prisma, req.params.provider, record));
    }
    res.status(202).json({ processed: results.length, results });
  } catch (error) {
    handle(error, res);
  }
});

router.post('/sync/:provider/pull', isCorporate, async (req, res) => {
  try {
    const resource = req.params.provider === 'crm' ? 'lead' : req.params.provider;
    res.status(202).json(await pullProviderSync(req.prisma, req.params.provider, resource));
  } catch (error) {
    handle(error, res);
  }
});

router.get('/metrics', async (req, res) => {
  try {
    res.json(await conversionMetrics(req.prisma, actor(req)));
  } catch (error) {
    handle(error, res);
  }
});

module.exports = router;
