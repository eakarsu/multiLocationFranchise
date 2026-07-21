const { createHmac, timingSafeEqual } = require('node:crypto');
const { z } = require('zod');

class WebhookVerificationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

const webhookSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.string().min(1).max(200),
  createdAt: z.string().datetime().optional(),
  data: z.record(z.string(), z.unknown()),
});

function signWebhook(rawBody, timestamp, secret) {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

function verifyWebhook(rawBody, signatureHeader, timestampHeader, secret, now = Date.now()) {
  if (!secret) throw new WebhookVerificationError('Webhook secret is not configured');
  if (!signatureHeader || !timestampHeader) {
    throw new WebhookVerificationError('Webhook signature is missing');
  }
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp * 1000) > 5 * 60 * 1000) {
    throw new WebhookVerificationError('Webhook timestamp is outside the replay window');
  }
  const supplied = signatureHeader.startsWith('v1=') ? signatureHeader.slice(3) : signatureHeader;
  const expected = signWebhook(rawBody, timestampHeader, secret);
  const suppliedBuffer = Buffer.from(supplied, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    throw new WebhookVerificationError('Webhook signature is invalid');
  }
  let value;
  try {
    value = JSON.parse(rawBody);
  } catch {
    throw new WebhookVerificationError('Webhook body is invalid JSON');
  }
  const parsed = webhookSchema.safeParse(value);
  if (!parsed.success) throw new WebhookVerificationError('Webhook payload is invalid');
  return parsed.data;
}

module.exports = {
  WebhookVerificationError,
  webhookSchema,
  signWebhook,
  verifyWebhook,
};
