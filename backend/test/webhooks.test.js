const test = require('node:test');
const assert = require('node:assert/strict');
const { signWebhook, verifyWebhook, WebhookVerificationError } = require('../src/revenue/webhooks');

test('signed webhooks are parsed inside the replay window', () => {
  const timestamp = '1700000000';
  const secret = 'a-webhook-secret-that-is-not-committed';
  const body = JSON.stringify({
    id: 'evt-1',
    type: 'lead.updated',
    createdAt: '2023-11-14T22:13:20.000Z',
    data: { record: { id: 'lead-1' } },
  });
  const signature = `v1=${signWebhook(body, timestamp, secret)}`;
  assert.equal(verifyWebhook(body, signature, timestamp, secret, 1_700_000_000_000).id, 'evt-1');
});

test('tampered and replayed webhooks are rejected', () => {
  const secret = 'a-webhook-secret-that-is-not-committed';
  const body = JSON.stringify({ id: 'evt-1', type: 'event', data: {} });
  assert.throws(
    () => verifyWebhook(body, 'v1=00', '1700000000', secret, 1_700_000_000_000),
    WebhookVerificationError,
  );
  const signature = signWebhook(body, '1700000000', secret);
  assert.throws(
    () => verifyWebhook(body, signature, '1700000000', secret, 1_700_001_000_000),
    /replay window/,
  );
});
