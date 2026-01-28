const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, isCorporate } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, isActive, search } = req.query;

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }

    const products = await req.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get product by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await req.prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        localPricing: {
          include: { location: { select: { id: true, name: true, code: true } } }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Create product
router.post('/', authenticateToken, isCorporate, [
  body('name').notEmpty().trim(),
  body('sku').notEmpty().trim(),
  body('basePrice').isFloat({ min: 0 }),
  body('category').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, sku, description, basePrice, category } = req.body;

    // Check if SKU already exists
    const existingProduct = await req.prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    const product = await req.prisma.product.create({
      data: { name, sku, description, basePrice, category }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { name, description, basePrice, category, isActive } = req.body;

    const product = await req.prisma.product.update({
      where: { id: req.params.id },
      data: { name, description, basePrice, category, isActive }
    });

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get product categories
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

module.exports = router;
