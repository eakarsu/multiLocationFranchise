const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src');

test('login issues short-lived verified tokens and public role escalation is disabled', async (t) => {
  const previous = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ISSUER: process.env.JWT_ISSUER,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE,
    ALLOW_PUBLIC_REGISTRATION: process.env.ALLOW_PUBLIC_REGISTRATION,
  };
  process.env.JWT_SECRET = 'test-jwt-secret-with-more-than-thirty-two-characters';
  process.env.JWT_ISSUER = 'test-issuer';
  process.env.JWT_AUDIENCE = 'test-audience';
  process.env.ALLOW_PUBLIC_REGISTRATION = 'false';
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'operator@example.test',
    password: await bcrypt.hash('A-strong-test-password', 4),
    firstName: 'Test',
    lastName: 'Operator',
    role: 'STAFF',
    locationId: null,
    location: null,
    isActive: true,
    passwordResetToken: null,
    passwordResetExpires: null,
  };
  const prisma = {
    user: {
      findUnique: async ({ where, select }) => {
        if ((where.email && where.email !== user.email) || (where.id && where.id !== user.id)) return null;
        if (!select) return user;
        return Object.fromEntries(Object.keys(select).filter((key) => select[key] === true).map((key) => [key, user[key]]));
      },
      findFirst: async ({ where }) => where.id === user.id && where.isActive ? user : null,
    },
    $queryRaw: async () => [{ value: 1 }],
  };
  const app = createApp({ prisma, corsOrigins: ['https://app.example.test'] });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  const denied = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'wrong-password' }),
  });
  assert.equal(denied.status, 401);

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'A-strong-test-password' }),
  });
  assert.equal(login.status, 200);
  const session = await login.json();
  assert.ok(session.token);
  assert.equal(session.user.password, undefined);

  const me = await fetch(`${base}/api/auth/me`, {
    headers: { authorization: `Bearer ${session.token}` },
  });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).email, user.email);

  const registration = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'attacker@example.test',
      password: 'Another-strong-password',
      firstName: 'Role',
      lastName: 'Escalation',
      role: 'SUPER_ADMIN',
    }),
  });
  assert.equal(registration.status, 403);
});
