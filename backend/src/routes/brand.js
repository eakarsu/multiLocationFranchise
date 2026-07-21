const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, isCorporate } = require('../middleware/auth');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();

// =====================
// Brand Guidelines
// =====================

// Get all brand guidelines
router.get('/guidelines', authenticateToken, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [guidelines, total] = await Promise.all([
      req.prisma.brandGuideline.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.brandGuideline.count({ where })
    ]);

    res.json(paginatedResponse(guidelines, total, page, limit));
  } catch (error) {
    console.error('Get guidelines error:', error);
    res.status(500).json({ error: 'Failed to get guidelines' });
  }
});

// Get guideline by ID
router.get('/guidelines/:id', authenticateToken, async (req, res) => {
  try {
    const guideline = await req.prisma.brandGuideline.findUnique({
      where: { id: req.params.id }
    });

    if (!guideline) {
      return res.status(404).json({ error: 'Guideline not found' });
    }

    res.json(guideline);
  } catch (error) {
    console.error('Get guideline error:', error);
    res.status(500).json({ error: 'Failed to get guideline' });
  }
});

// Create guideline
router.post('/guidelines', authenticateToken, isCorporate, [
  body('title').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('content').notEmpty(),
  body('version').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, category, content, version } = req.body;

    const guideline = await req.prisma.brandGuideline.create({
      data: { title, category, content, version }
    });

    res.status(201).json(guideline);
  } catch (error) {
    console.error('Create guideline error:', error);
    res.status(500).json({ error: 'Failed to create guideline' });
  }
});

// Update guideline
router.put('/guidelines/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { title, category, content, version, isActive } = req.body;

    const guideline = await req.prisma.brandGuideline.update({
      where: { id: req.params.id },
      data: { title, category, content, version, isActive }
    });

    res.json(guideline);
  } catch (error) {
    console.error('Update guideline error:', error);
    res.status(500).json({ error: 'Failed to update guideline' });
  }
});

// Delete guideline
router.delete('/guidelines/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.brandGuideline.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Guideline deleted successfully' });
  } catch (error) {
    console.error('Delete guideline error:', error);
    res.status(500).json({ error: 'Failed to delete guideline' });
  }
});

// Bulk delete guidelines
router.post('/guidelines/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await req.prisma.brandGuideline.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false }
    });

    res.json({ message: 'Guidelines deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete guidelines error:', error);
    res.status(500).json({ error: 'Failed to bulk delete guidelines' });
  }
});

// Bulk update guidelines
router.post('/guidelines/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const result = await req.prisma.brandGuideline.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: 'Guidelines updated successfully', count: result.count });
  } catch (error) {
    console.error('Bulk update guidelines error:', error);
    res.status(500).json({ error: 'Failed to bulk update guidelines' });
  }
});

// =====================
// Marketing Templates
// =====================

// Get all marketing templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [templates, total] = await Promise.all([
      req.prisma.marketingTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.marketingTemplate.count({ where })
    ]);

    res.json(paginatedResponse(templates, total, page, limit));
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get template by ID
router.get('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const template = await req.prisma.marketingTemplate.findUnique({
      where: { id: req.params.id }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Create template
router.post('/templates', authenticateToken, isCorporate, [
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('fileUrl').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, description, fileUrl, thumbnail } = req.body;

    const template = await req.prisma.marketingTemplate.create({
      data: { name, category, description, fileUrl, thumbnail }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/templates/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { name, category, description, fileUrl, thumbnail, isActive } = req.body;

    const template = await req.prisma.marketingTemplate.update({
      where: { id: req.params.id },
      data: { name, category, description, fileUrl, thumbnail, isActive }
    });

    res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/templates/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.marketingTemplate.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Bulk delete templates
router.post('/templates/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await req.prisma.marketingTemplate.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false }
    });

    res.json({ message: 'Templates deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete templates error:', error);
    res.status(500).json({ error: 'Failed to bulk delete templates' });
  }
});

// Bulk update templates
router.post('/templates/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const result = await req.prisma.marketingTemplate.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: 'Templates updated successfully', count: result.count });
  } catch (error) {
    console.error('Bulk update templates error:', error);
    res.status(500).json({ error: 'Failed to bulk update templates' });
  }
});

// =====================
// Approved Vendors
// =====================

// Get all approved vendors
router.get('/vendors', authenticateToken, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [vendors, total] = await Promise.all([
      req.prisma.approvedVendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.approvedVendor.count({ where })
    ]);

    res.json(paginatedResponse(vendors, total, page, limit));
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Failed to get vendors' });
  }
});

// Get vendor by ID
router.get('/vendors/:id', authenticateToken, async (req, res) => {
  try {
    const vendor = await req.prisma.approvedVendor.findUnique({
      where: { id: req.params.id }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(vendor);
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Failed to get vendor' });
  }
});

// Create vendor
router.post('/vendors', authenticateToken, isCorporate, [
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, contactName, contactEmail, contactPhone, website, notes } = req.body;

    const vendor = await req.prisma.approvedVendor.create({
      data: { name, category, contactName, contactEmail, contactPhone, website, notes }
    });

    res.status(201).json(vendor);
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// Update vendor
router.put('/vendors/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { name, category, contactName, contactEmail, contactPhone, website, notes, isActive } = req.body;

    const vendor = await req.prisma.approvedVendor.update({
      where: { id: req.params.id },
      data: { name, category, contactName, contactEmail, contactPhone, website, notes, isActive }
    });

    res.json(vendor);
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// Delete vendor
router.delete('/vendors/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.approvedVendor.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// Bulk delete vendors
router.post('/vendors/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await req.prisma.approvedVendor.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false }
    });

    res.json({ message: 'Vendors deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete vendors error:', error);
    res.status(500).json({ error: 'Failed to bulk delete vendors' });
  }
});

// Bulk update vendors
router.post('/vendors/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const result = await req.prisma.approvedVendor.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: 'Vendors updated successfully', count: result.count });
  } catch (error) {
    console.error('Bulk update vendors error:', error);
    res.status(500).json({ error: 'Failed to bulk update vendors' });
  }
});

// =====================
// Training Materials
// =====================

// Get all training materials
router.get('/training', authenticateToken, async (req, res) => {
  try {
    const { category, contentType, isRequired, isActive } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (category) where.category = category;
    if (contentType) where.contentType = contentType;
    if (isRequired !== undefined) where.isRequired = isRequired === 'true';
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [materials, total] = await Promise.all([
      req.prisma.trainingMaterial.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.trainingMaterial.count({ where })
    ]);

    res.json(paginatedResponse(materials, total, page, limit));
  } catch (error) {
    console.error('Get training materials error:', error);
    res.status(500).json({ error: 'Failed to get training materials' });
  }
});

// Get training material by ID
router.get('/training/:id', authenticateToken, async (req, res) => {
  try {
    const material = await req.prisma.trainingMaterial.findUnique({
      where: { id: req.params.id }
    });

    if (!material) {
      return res.status(404).json({ error: 'Training material not found' });
    }

    res.json(material);
  } catch (error) {
    console.error('Get training material error:', error);
    res.status(500).json({ error: 'Failed to get training material' });
  }
});

// Create training material
router.post('/training', authenticateToken, isCorporate, [
  body('title').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('contentType').isIn(['video', 'document', 'quiz']),
  body('contentUrl').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, category, description, contentType, contentUrl, duration, isRequired } = req.body;

    const material = await req.prisma.trainingMaterial.create({
      data: { title, category, description, contentType, contentUrl, duration, isRequired }
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('Create training material error:', error);
    res.status(500).json({ error: 'Failed to create training material' });
  }
});

// Update training material
router.put('/training/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { title, category, description, contentType, contentUrl, duration, isRequired, isActive } = req.body;

    const material = await req.prisma.trainingMaterial.update({
      where: { id: req.params.id },
      data: { title, category, description, contentType, contentUrl, duration, isRequired, isActive }
    });

    res.json(material);
  } catch (error) {
    console.error('Update training material error:', error);
    res.status(500).json({ error: 'Failed to update training material' });
  }
});

// Delete training material
router.delete('/training/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.trainingMaterial.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Training material deleted successfully' });
  } catch (error) {
    console.error('Delete training material error:', error);
    res.status(500).json({ error: 'Failed to delete training material' });
  }
});

// Bulk delete training materials
router.post('/training/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await req.prisma.trainingMaterial.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false }
    });

    res.json({ message: 'Training materials deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete training materials error:', error);
    res.status(500).json({ error: 'Failed to bulk delete training materials' });
  }
});

// Bulk update training materials
router.post('/training/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const result = await req.prisma.trainingMaterial.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: 'Training materials updated successfully', count: result.count });
  } catch (error) {
    console.error('Bulk update training materials error:', error);
    res.status(500).json({ error: 'Failed to bulk update training materials' });
  }
});

// =====================
// Compliance Checklists
// =====================

// Get all compliance checklists
router.get('/compliance-checklists', authenticateToken, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [checklists, total] = await Promise.all([
      req.prisma.complianceChecklist.findMany({
        where,
        include: {
          items: { orderBy: { order: 'asc' } },
          _count: { select: { audits: true } }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.complianceChecklist.count({ where })
    ]);

    res.json(paginatedResponse(checklists, total, page, limit));
  } catch (error) {
    console.error('Get compliance checklists error:', error);
    res.status(500).json({ error: 'Failed to get compliance checklists' });
  }
});

// Get compliance checklist by ID
router.get('/compliance-checklists/:id', authenticateToken, async (req, res) => {
  try {
    const checklist = await req.prisma.complianceChecklist.findUnique({
      where: { id: req.params.id },
      include: {
        items: { orderBy: { order: 'asc' } }
      }
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    res.json(checklist);
  } catch (error) {
    console.error('Get compliance checklist error:', error);
    res.status(500).json({ error: 'Failed to get compliance checklist' });
  }
});

// Create compliance checklist
router.post('/compliance-checklists', authenticateToken, isCorporate, [
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, description, items } = req.body;

    const checklist = await req.prisma.complianceChecklist.create({
      data: {
        name,
        category,
        description,
        items: items && items.length > 0 ? {
          create: items.map((item, index) => ({
            item: item.item,
            description: item.description,
            order: index,
            isCritical: item.isCritical || false
          }))
        } : undefined
      },
      include: { items: { orderBy: { order: 'asc' } } }
    });

    res.status(201).json(checklist);
  } catch (error) {
    console.error('Create compliance checklist error:', error);
    res.status(500).json({ error: 'Failed to create compliance checklist' });
  }
});

// Update compliance checklist
router.put('/compliance-checklists/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { name, category, description, isActive, items } = req.body;

    // Update checklist
    await req.prisma.complianceChecklist.update({
      where: { id: req.params.id },
      data: { name, category, description, isActive }
    });

    // Update items if provided
    if (items) {
      // Delete existing items
      await req.prisma.complianceChecklistItem.deleteMany({
        where: { checklistId: req.params.id }
      });

      // Create new items
      await req.prisma.complianceChecklistItem.createMany({
        data: items.map((item, index) => ({
          checklistId: req.params.id,
          item: item.item,
          description: item.description,
          order: index,
          isCritical: item.isCritical || false
        }))
      });
    }

    const updatedChecklist = await req.prisma.complianceChecklist.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { order: 'asc' } } }
    });

    res.json(updatedChecklist);
  } catch (error) {
    console.error('Update compliance checklist error:', error);
    res.status(500).json({ error: 'Failed to update compliance checklist' });
  }
});

// Delete compliance checklist
router.delete('/compliance-checklists/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.complianceChecklist.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Compliance checklist deleted successfully' });
  } catch (error) {
    console.error('Delete compliance checklist error:', error);
    res.status(500).json({ error: 'Failed to delete compliance checklist' });
  }
});

// Get brand categories
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const [guidelineCategories, templateCategories, vendorCategories, trainingCategories] = await Promise.all([
      req.prisma.brandGuideline.findMany({ select: { category: true }, distinct: ['category'] }),
      req.prisma.marketingTemplate.findMany({ select: { category: true }, distinct: ['category'] }),
      req.prisma.approvedVendor.findMany({ select: { category: true }, distinct: ['category'] }),
      req.prisma.trainingMaterial.findMany({ select: { category: true }, distinct: ['category'] })
    ]);

    res.json({
      guidelines: guidelineCategories.map(c => c.category),
      templates: templateCategories.map(c => c.category),
      vendors: vendorCategories.map(c => c.category),
      training: trainingCategories.map(c => c.category)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

module.exports = router;
