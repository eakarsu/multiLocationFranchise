require('dotenv').config({ quiet: true });

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { DomainError, errorResponse } = require('./revenue/errors');

const routeMounts = [
  ['/api/auth', './routes/auth'],
  ['/api/users', './routes/users'],
  ['/api/locations', './routes/locations'],
  ['/api/territories', './routes/territories'],
  ['/api/products', './routes/products'],
  ['/api/brand', './routes/brand'],
  ['/api/operations', './routes/operations'],
  ['/api/financial', './routes/financial'],
  ['/api/communication', './routes/communication'],
  ['/api/dashboard', './routes/dashboard'],
  ['/api/metadata', './routes/metadata'],
  ['/api/revenue', './routes/revenue'],
  ['/api/ai', './routes/runtimeAi'],
  ['/api/webhooks', './routes/providerWebhooks'],
  ['/api/internal/jobs', './routes/internalJobs'],
];

function parseOrigins(value) {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);
}

function validateRuntimeConfiguration() {
  const required = [
    'DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGINS', 'INTERNAL_JOB_SECRET',
    'OUTBOX_ENCRYPTION_KEY', 'PUBLIC_APP_URL',
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  if (process.env.INTERNAL_JOB_SECRET.length < 32) {
    throw new Error('INTERNAL_JOB_SECRET must contain at least 32 characters');
  }
  if (process.env.OUTBOX_ENCRYPTION_KEY.length < 32) {
    throw new Error('OUTBOX_ENCRYPTION_KEY must contain at least 32 characters');
  }
  parseOrigins(process.env.CORS_ORIGINS);
  const appUrl = new URL(process.env.PUBLIC_APP_URL);
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(appUrl.hostname);
  if (process.env.NODE_ENV === 'production' && appUrl.protocol !== 'https:' &&
    !(appUrl.protocol === 'http:' && loopback)) {
    throw new Error('PUBLIC_APP_URL must use HTTPS in production');
  }
}

function createApp({ prisma, corsOrigins = parseOrigins(process.env.CORS_ORIGINS) } = {}) {
  if (!prisma) throw new Error('createApp requires a Prisma client');
  const allowedOrigins = new Set(corsOrigins);
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({
    credentials: false,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new DomainError('ORIGIN_DENIED', 'Origin is not allowed', 403));
    },
  }));

  const generalLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  app.use('/api', generalLimiter);
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password'], authLimiter);

  app.use(express.json({
    limit: '1mb',
    verify(req, _res, buffer) {
      if (req.originalUrl.startsWith('/api/webhooks/')) req.rawBody = buffer.toString('utf8');
    },
  }));
  app.use((req, _res, next) => {
    req.prisma = prisma;
    next();
  });

  app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/health/ready', async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ready' });
    } catch (error) {
      next(new DomainError('DATABASE_UNAVAILABLE', 'Database is not ready', 503, { cause: error }));
    }
  });

  for (const [prefix, modulePath] of routeMounts) app.use(prefix, require(modulePath));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found', code: 'NOT_FOUND' }));

  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
  }

  app.use((err, _req, res, _next) => {
    const response = errorResponse(err);
    if (response.status >= 500) console.error(err);
    res.status(response.status).json(response.body);
  });
  return app;
}

async function start() {
  validateRuntimeConfiguration();
  const prisma = new PrismaClient();
  const app = createApp({ prisma });
  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
  const server = app.listen(port, '127.0.0.1', () => console.log(`Server listening on 127.0.0.1:${port}`));

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; shutting down`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return { app, prisma, server };
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { createApp, start, parseOrigins, validateRuntimeConfiguration };
