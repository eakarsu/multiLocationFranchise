const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { body, validationResult } = require('express-validator');
const { authenticateToken, signAccessToken } = require('../middleware/auth');
const { seal } = require('../revenue/secrets');

const router = express.Router();
const RESET_MESSAGE = 'If that email exists, password reset instructions will be sent.';

function validationErrors(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ errors: errors.array() });
  return true;
}

function tokenDigest(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicAppUrl() {
  const raw = process.env.PUBLIC_APP_URL;
  if (!raw) throw new Error('PUBLIC_APP_URL is required to send password resets');
  const url = new URL(raw);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('PUBLIC_APP_URL must use HTTPS outside localhost');
  }
  return url;
}

// Public self-registration is intentionally disabled by default. When explicitly
// enabled, callers can only create least-privileged, unassigned staff accounts.
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 12, max: 128 }),
  body('firstName').isLength({ min: 1, max: 100 }).trim(),
  body('lastName').isLength({ min: 1, max: 100 }).trim(),
  body('phone').optional({ nullable: true }).isLength({ max: 40 }).trim(),
], async (req, res, next) => {
  try {
    if (process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
      return res.status(403).json({ error: 'Public registration is disabled' });
    }
    if (validationErrors(req, res)) return;
    const { email, password, firstName, lastName, phone } = req.body;
    const existingUser = await req.prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'Email already registered' });

    const user = await req.prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
        firstName,
        lastName,
        role: 'STAFF',
        locationId: null,
        phone: phone || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        locationId: true,
      },
    });
    res.status(201).json({ user, token: signAccessToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1, max: 128 }),
], async (req, res, next) => {
  try {
    if (validationErrors(req, res)) return;
    const user = await req.prisma.user.findUnique({
      where: { email: req.body.email },
      include: { location: true },
    });
    if (!user || !user.isActive || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.passwordResetToken;
    delete safeUser.passwordResetExpires;
    res.json({ user: safeUser, token: signAccessToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], async (req, res, next) => {
  try {
    if (validationErrors(req, res)) return;
    const user = await req.prisma.user.findUnique({ where: { email: req.body.email } });
    if (user?.isActive) {
      const resetToken = crypto.randomBytes(32).toString('base64url');
      const resetExpires = new Date(Date.now() + 30 * 60_000);
      const resetUrl = new URL('/reset-password', publicAppUrl());
      resetUrl.searchParams.set('token', resetToken);
      const requestId = crypto.randomUUID();
      await req.prisma.$transaction([
        req.prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: tokenDigest(resetToken),
            passwordResetExpires: resetExpires,
          },
        }),
        req.prisma.revenueOutbox.create({
          data: {
            topic: 'auth.reset-password',
            aggregateType: 'user',
            aggregateId: user.id,
            payload: { recipient: user.email, encryptedResetUrl: seal(resetUrl.toString()) },
            idempotencyKey: `auth-reset:${user.id}:${requestId}`,
          },
        }),
      ]);
    }
    res.json({ message: RESET_MESSAGE });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', [
  body('token').isLength({ min: 32, max: 256 }),
  body('newPassword').isLength({ min: 12, max: 128 }),
], async (req, res, next) => {
  try {
    if (validationErrors(req, res)) return;
    const user = await req.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenDigest(req.body.token),
        passwordResetExpires: { gt: new Date() },
        isActive: true,
      },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });
    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(req.body.newPassword, 12),
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatar: true,
        locationId: true,
        location: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authenticateToken, [
  body('firstName').optional().isLength({ min: 1, max: 100 }).trim(),
  body('lastName').optional().isLength({ min: 1, max: 100 }).trim(),
  body('phone').optional({ nullable: true }).isLength({ max: 40 }).trim(),
  body('avatar').optional({ nullable: true }).isURL({ protocols: ['https'] }),
], async (req, res, next) => {
  try {
    if (validationErrors(req, res)) return;
    const permitted = ['firstName', 'lastName', 'phone', 'avatar'];
    const data = Object.fromEntries(permitted.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
    const user = await req.prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatar: true,
      },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/change-password', authenticateToken, [
  body('currentPassword').isLength({ min: 1, max: 128 }),
  body('newPassword').isLength({ min: 12, max: 128 }),
], async (req, res, next) => {
  try {
    if (validationErrors(req, res)) return;
    const user = await req.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(req.body.currentPassword, user.password))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    await req.prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: await bcrypt.hash(req.body.newPassword, 12),
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
