const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, isCorporate, isManager } = require('../middleware/auth');

const router = express.Router();

// Get all locations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, territoryId, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (territoryId) where.territoryId = territoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }

    // If user is location manager, only show their location
    if (req.user.role === 'LOCATION_MANAGER' && req.user.locationId) {
      where.id = req.user.locationId;
    }

    const locations = await req.prisma.location.findMany({
      where,
      include: {
        territory: true,
        _count: { select: { users: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

// Get location by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const location = await req.prisma.location.findUnique({
      where: { id: req.params.id },
      include: {
        territory: true,
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        users: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true }
        }
      }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// Create location (corporate only)
router.post('/', authenticateToken, isCorporate, [
  body('name').notEmpty().trim(),
  body('code').notEmpty().trim(),
  body('address').notEmpty().trim(),
  body('city').notEmpty().trim(),
  body('state').notEmpty().trim(),
  body('zipCode').notEmpty().trim(),
  body('phone').notEmpty(),
  body('email').isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, code, address, city, state, zipCode, country,
      phone, email, latitude, longitude, timezone, status,
      territoryId, openDate
    } = req.body;

    // Check if code already exists
    const existingLocation = await req.prisma.location.findUnique({ where: { code } });
    if (existingLocation) {
      return res.status(400).json({ error: 'Location code already exists' });
    }

    const location = await req.prisma.location.create({
      data: {
        name,
        code,
        address,
        city,
        state,
        zipCode,
        country: country || 'USA',
        phone,
        email,
        latitude,
        longitude,
        timezone: timezone || 'America/New_York',
        status: status || 'ACTIVE',
        territoryId,
        openDate: openDate ? new Date(openDate) : null
      },
      include: { territory: true }
    });

    // Create default operating hours
    const defaultHours = [];
    for (let i = 0; i < 7; i++) {
      defaultHours.push({
        locationId: location.id,
        dayOfWeek: i,
        openTime: '09:00',
        closeTime: '21:00',
        isClosed: i === 0 // Sunday closed by default
      });
    }
    await req.prisma.operatingHours.createMany({ data: defaultHours });

    res.status(201).json(location);
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Update location
router.put('/:id', authenticateToken, isManager, async (req, res) => {
  try {
    const {
      name, address, city, state, zipCode, country,
      phone, email, latitude, longitude, timezone, status,
      territoryId, openDate
    } = req.body;

    const location = await req.prisma.location.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        country,
        phone,
        email,
        latitude,
        longitude,
        timezone,
        status,
        territoryId,
        openDate: openDate ? new Date(openDate) : undefined
      },
      include: { territory: true }
    });

    res.json(location);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Delete location (corporate only)
router.delete('/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.location.update({
      where: { id: req.params.id },
      data: { status: 'INACTIVE' }
    });

    res.json({ message: 'Location deactivated successfully' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// Get operating hours
router.get('/:id/hours', authenticateToken, async (req, res) => {
  try {
    const hours = await req.prisma.operatingHours.findMany({
      where: { locationId: req.params.id },
      orderBy: { dayOfWeek: 'asc' }
    });

    res.json(hours);
  } catch (error) {
    console.error('Get operating hours error:', error);
    res.status(500).json({ error: 'Failed to get operating hours' });
  }
});

// Update operating hours
router.put('/:id/hours', authenticateToken, isManager, async (req, res) => {
  try {
    const { hours } = req.body;

    // Update each day's hours
    const updates = hours.map(h =>
      req.prisma.operatingHours.upsert({
        where: {
          locationId_dayOfWeek: {
            locationId: req.params.id,
            dayOfWeek: h.dayOfWeek
          }
        },
        update: {
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed
        },
        create: {
          locationId: req.params.id,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed
        }
      })
    );

    await Promise.all(updates);

    const updatedHours = await req.prisma.operatingHours.findMany({
      where: { locationId: req.params.id },
      orderBy: { dayOfWeek: 'asc' }
    });

    res.json(updatedHours);
  } catch (error) {
    console.error('Update operating hours error:', error);
    res.status(500).json({ error: 'Failed to update operating hours' });
  }
});

// Get local pricing for location
router.get('/:id/pricing', authenticateToken, async (req, res) => {
  try {
    const pricing = await req.prisma.localPricing.findMany({
      where: { locationId: req.params.id },
      include: { product: true }
    });

    res.json(pricing);
  } catch (error) {
    console.error('Get local pricing error:', error);
    res.status(500).json({ error: 'Failed to get local pricing' });
  }
});

// Update local pricing
router.put('/:id/pricing', authenticateToken, isManager, async (req, res) => {
  try {
    const { pricing } = req.body;

    const updates = pricing.map(p =>
      req.prisma.localPricing.upsert({
        where: {
          locationId_productId: {
            locationId: req.params.id,
            productId: p.productId
          }
        },
        update: { price: p.price, isActive: p.isActive },
        create: {
          locationId: req.params.id,
          productId: p.productId,
          price: p.price,
          isActive: p.isActive !== undefined ? p.isActive : true
        }
      })
    );

    await Promise.all(updates);

    const updatedPricing = await req.prisma.localPricing.findMany({
      where: { locationId: req.params.id },
      include: { product: true }
    });

    res.json(updatedPricing);
  } catch (error) {
    console.error('Update local pricing error:', error);
    res.status(500).json({ error: 'Failed to update local pricing' });
  }
});

// Get location staff
router.get('/:id/staff', authenticateToken, async (req, res) => {
  try {
    const staff = await req.prisma.user.findMany({
      where: { locationId: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json(staff);
  } catch (error) {
    console.error('Get location staff error:', error);
    res.status(500).json({ error: 'Failed to get staff' });
  }
});

// Get location statuses
router.get('/meta/statuses', authenticateToken, async (req, res) => {
  res.json([
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'SUSPENDED', label: 'Suspended' }
  ]);
});

module.exports = router;
