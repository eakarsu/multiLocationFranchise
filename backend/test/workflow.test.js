const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, parseOrigins } = require('../src');
const { seal, open } = require('../src/revenue/secrets');

test('origin configuration is normalized', () => {
  assert.deepEqual(parseOrigins('https://app.example.com, http://localhost:5173/'), [
    'https://app.example.com',
    'http://localhost:5173',
  ]);
  assert.throws(() => parseOrigins('not a URL'));
});

test('sensitive outbox values are authenticated and encrypted', () => {
  const key = 'test-only-encryption-key-with-at-least-32-characters';
  const ciphertext = seal('https://app.example.test/reset?token=secret', key);
  assert.doesNotMatch(ciphertext, /token=secret/);
  assert.equal(open(ciphertext, key), 'https://app.example.test/reset?token=secret');
  const parts = ciphertext.split('.');
  parts[3] = `${parts[3][0] === 'A' ? 'B' : 'A'}${parts[3].slice(1)}`;
  assert.throws(() => open(parts.join('.'), key));
});

test('HTTP shell exposes separate liveness/readiness and safe API errors', async (t) => {
  const prisma = { $queryRaw: async () => [{ '?column?': 1 }] };
  const app = createApp({ prisma, corsOrigins: ['https://app.example.test'] });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  const live = await fetch(`${base}/api/health/live`, {
    headers: { origin: 'https://app.example.test' },
  });
  assert.equal(live.status, 200);
  assert.equal(live.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(await live.json(), { status: 'ok' });

  const ready = await fetch(`${base}/api/health/ready`);
  assert.equal(ready.status, 200);
  const missing = await fetch(`${base}/api/no-such-route`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).code, 'NOT_FOUND');

  const denied = await fetch(`${base}/api/health/live`, {
    headers: { origin: 'https://attacker.example' },
  });
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).code, 'ORIGIN_DENIED');
});
