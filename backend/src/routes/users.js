const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { authenticateToken, isCorporate } = require('../middleware/auth');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();
const USER_ROLES = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'REGIONAL_MANAGER', 'LOCATION_MANAGER', 'STAFF'];

function canManageUser(actor, targetRole) {
  return actor.role === 'SUPER_ADMIN' || targetRole !== 'SUPER_ADMIN';
}

function safeUserSelect() {
  return {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    phone: true,
    avatar: true,
    isActive: true,
    locationId: true,
    location: { include: { territory: true } },
    createdAt: true,
    updatedAt: true,
  };
}

// Get all users (corporate only, with pagination and sorting)
router.get('/', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { role, locationId, isActive, search } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (role) where.role = role;
    if (locationId) where.locationId = locationId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      req.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          locationId: true,
          location: { select: { id: true, name: true, code: true } },
          createdAt: true
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.user.count({ where })
    ]);

    res.json(paginatedResponse(users, total, page, limit));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    if (!['SUPER_ADMIN', 'CORPORATE_ADMIN'].includes(req.user.role) && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const user = await req.prisma.user.findUnique({
      where: { id: req.params.id },
      select: safeUserSelect(),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Create user (corporate only)
router.post('/', authenticateToken, isCorporate, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 12, max: 128 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('role').isIn(USER_ROLES)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, locationId, phone } = req.body;
    if (!canManageUser(req.user, role)) return res.status(403).json({ error: 'Not authorized' });

    const existingUser = await req.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await req.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        locationId,
        phone
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        locationId: true,
        location: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Bulk delete users (soft delete - deactivate)
router.post('/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || ids.includes(req.user.id)) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (req.user.role !== 'SUPER_ADMIN' && await req.prisma.user.count({
      where: { id: { in: ids }, role: 'SUPER_ADMIN' },
    })) return res.status(403).json({ error: 'Not authorized' });

    const result = await req.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false }
    });

    res.json({ message: `${result.count} users deactivated`, count: result.count });
  } catch (error) {
    console.error('Bulk delete users error:', error);
    res.status(500).json({ error: 'Failed to bulk delete users' });
  }
});

// Bulk update users
router.post('/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const permitted = ['role', 'locationId', 'isActive'];
    if (Object.keys(data).some((key) => !permitted.includes(key)) ||
      (data.role && !USER_ROLES.includes(data.role)) ||
      (data.role && !canManageUser(req.user, data.role)) ||
      (ids.includes(req.user.id) && data.isActive === false)) {
      return res.status(400).json({ error: 'Bulk update contains disallowed fields' });
    }
    if (req.user.role !== 'SUPER_ADMIN' && await req.prisma.user.count({
      where: { id: { in: ids }, role: 'SUPER_ADMIN' },
    })) return res.status(403).json({ error: 'Not authorized' });

    const safeData = Object.fromEntries(permitted.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
    const updates = ids.map(id =>
      req.prisma.user.update({
        where: { id },
        data: safeData
      })
    );

    const results = await Promise.all(updates);

    res.json({ message: `${results.length} users updated`, count: results.length });
  } catch (error) {
    console.error('Bulk update users error:', error);
    res.status(500).json({ error: 'Failed to bulk update users' });
  }
});

// Update user
router.put('/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { firstName, lastName, role, locationId, phone, isActive } = req.body;

    if (role && !USER_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const current = await req.prisma.user.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'User not found' });
    if (!canManageUser(req.user, current.role) || (role && !canManageUser(req.user, role)) ||
      (req.user.id === req.params.id && isActive === false)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const user = await req.prisma.user.update({
      where: { id: req.params.id },
      data: { firstName, lastName, role, locationId, phone, isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        locationId: true,
        location: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Reset user password (corporate only)
router.post('/:id/reset-password', authenticateToken, isCorporate, [
  body('newPassword').isLength({ min: 12, max: 128 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const target = await req.prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canManageUser(req.user, target.role)) return res.status(403).json({ error: 'Not authorized' });
    const hashedPassword = await bcrypt.hash(req.body.newPassword, 12);

    await req.prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete user (soft delete)
router.delete('/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'You cannot deactivate yourself' });
    const target = await req.prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!canManageUser(req.user, target.role)) return res.status(403).json({ error: 'Not authorized' });
    await req.prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get user roles
router.get('/meta/roles', authenticateToken, async (req, res) => {
  res.json([
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'CORPORATE_ADMIN', label: 'Corporate Admin' },
    { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
    { value: 'LOCATION_MANAGER', label: 'Location Manager' },
    { value: 'STAFF', label: 'Staff' }
  ]);
});

// Get current user profile
router.get('/profile/me', authenticateToken, async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: safeUserSelect(),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update current user profile
router.put('/profile/me', authenticateToken, [
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().isLength({ min: 1, max: 100 }).trim(),
  body('lastName').optional().isLength({ min: 1, max: 100 }).trim(),
  body('phone').optional({ nullable: true }).isLength({ max: 40 }).trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { firstName, lastName, email, phone } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await req.prisma.user.findFirst({
        where: { email, NOT: { id: req.user.id } }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const user = await req.prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName, email, phone },
      select: safeUserSelect(),
    });

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.post('/profile/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    if (newPassword.length < 12 || newPassword.length > 128) {
      return res.status(400).json({ message: 'New password must be 12 to 128 characters' });
    }

    const user = await req.prisma.user.findUnique({ where: { id: req.user.id } });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await req.prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
