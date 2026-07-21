const express = require('express');
const { verifyWebhook, WebhookVerificationError } = require('../revenue/webhooks');
const { ingestProviderWebhook } = require('../revenue/webhook-service');
const { errorResponse } = require('../revenue/errors');

const router = express.Router();
const secretNames = {
  crm: 'CRM_WEBHOOK_SECRET',
  email: 'EMAIL_WEBHOOK_SECRET',
  calendar: 'CALENDAR_WEBHOOK_SECRET',
  enrichment: 'ENRICHMENT_WEBHOOK_SECRET',
  consent: 'CONSENT_WEBHOOK_SECRET',
  suppression: 'SUPPRESSION_WEBHOOK_SECRET',
};

router.post('/:provider', async (req, res) => {
  const secretName = secretNames[req.params.provider];
  if (!secretName) return res.status(404).json({ error: 'Unknown provider' });
  try {
    const event = verifyWebhook(
      req.rawBody || JSON.stringify(req.body),
      req.get('x-webhook-signature'),
      req.get('x-webhook-timestamp'),
      process.env[secretName],
    );
    const result = await ingestProviderWebhook(req.prisma, req.params.provider, event);
    res.status(result.duplicate ? 200 : 202).json(result);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return res.status(401).json({ error: error.message });
    }
    const response = errorResponse(error);
    res.status(response.status).json(response.body);
  }
});

module.exports = router;
