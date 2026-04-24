const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, isCorporate } = require('../middleware/auth');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();

// Get all territories (with pagination and sorting)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { region, search } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (region) where.region = region;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [territories, total] = await Promise.all([
      req.prisma.territory.findMany({
        where,
        include: {
          _count: { select: { locations: true } }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.territory.count({ where })
    ]);

    res.json(paginatedResponse(territories, total, page, limit));
  } catch (error) {
    console.error('Get territories error:', error);
    res.status(500).json({ error: 'Failed to get territories' });
  }
});

// Get territory by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const territory = await req.prisma.territory.findUnique({
      where: { id: req.params.id },
      include: {
        locations: {
          select: { id: true, name: true, code: true, city: true, state: true, status: true }
        }
      }
    });

    if (!territory) {
      return res.status(404).json({ error: 'Territory not found' });
    }

    res.json(territory);
  } catch (error) {
    console.error('Get territory error:', error);
    res.status(500).json({ error: 'Failed to get territory' });
  }
});

// Create territory
router.post('/', authenticateToken, isCorporate, [
  body('name').notEmpty().trim(),
  body('region').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, region, description } = req.body;

    const territory = await req.prisma.territory.create({
      data: { name, region, description }
    });

    res.status(201).json(territory);
  } catch (error) {
    console.error('Create territory error:', error);
    res.status(500).json({ error: 'Failed to create territory' });
  }
});

// Bulk delete territories (hard delete, only those without locations)
router.post('/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    // Check which territories have locations
    const territoriesWithLocations = await req.prisma.territory.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { locations: true } } }
    });

    const cannotDelete = territoriesWithLocations
      .filter(t => t._count.locations > 0)
      .map(t => t.name);

    if (cannotDelete.length > 0) {
      return res.status(400).json({
        error: `Cannot delete territories with assigned locations: ${cannotDelete.join(', ')}`
      });
    }

    const result = await req.prisma.territory.deleteMany({
      where: { id: { in: ids } }
    });

    res.json({ message: `${result.count} territories deleted`, count: result.count });
  } catch (error) {
    console.error('Bulk delete territories error:', error);
    res.status(500).json({ error: 'Failed to bulk delete territories' });
  }
});

// Bulk update territories
router.post('/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const updates = ids.map(id =>
      req.prisma.territory.update({
        where: { id },
        data
      })
    );

    const results = await Promise.all(updates);

    res.json({ message: `${results.length} territories updated`, count: results.length });
  } catch (error) {
    console.error('Bulk update territories error:', error);
    res.status(500).json({ error: 'Failed to bulk update territories' });
  }
});

// Update territory
router.put('/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { name, region, description } = req.body;

    const territory = await req.prisma.territory.update({
      where: { id: req.params.id },
      data: { name, region, description }
    });

    res.json(territory);
  } catch (error) {
    console.error('Update territory error:', error);
    res.status(500).json({ error: 'Failed to update territory' });
  }
});

// Delete territory
router.delete('/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    // Check if territory has locations
    const locations = await req.prisma.location.count({
      where: { territoryId: req.params.id }
    });

    if (locations > 0) {
      return res.status(400).json({ error: 'Cannot delete territory with assigned locations' });
    }

    await req.prisma.territory.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Territory deleted successfully' });
  } catch (error) {
    console.error('Delete territory error:', error);
    res.status(500).json({ error: 'Failed to delete territory' });
  }
});

// Get unique regions
router.get('/meta/regions', authenticateToken, async (req, res) => {
  try {
    const regions = await req.prisma.territory.findMany({
      select: { region: true },
      distinct: ['region'],
      orderBy: { region: 'asc' }
    });

    res.json(regions.map(r => r.region));
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({ error: 'Failed to get regions' });
  }
});

module.exports = router;
