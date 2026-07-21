const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, isCorporate, isManager } = require('../middleware/auth');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();

// =====================
// Standard Operating Procedures (SOPs)
// =====================

// Get all SOPs
router.get('/sops', authenticateToken, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [sops, total] = await Promise.all([
      req.prisma.sOP.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.sOP.count({ where })
    ]);

    res.json(paginatedResponse(sops, total, page, limit));
  } catch (error) {
    console.error('Get SOPs error:', error);
    res.status(500).json({ error: 'Failed to get SOPs' });
  }
});

// Get SOP by ID
router.get('/sops/:id', authenticateToken, async (req, res) => {
  try {
    const sop = await req.prisma.sOP.findUnique({
      where: { id: req.params.id }
    });

    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    res.json(sop);
  } catch (error) {
    console.error('Get SOP error:', error);
    res.status(500).json({ error: 'Failed to get SOP' });
  }
});

// Create SOP
router.post('/sops', authenticateToken, isCorporate, [
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

    const sop = await req.prisma.sOP.create({
      data: { title, category, content, version }
    });

    res.status(201).json(sop);
  } catch (error) {
    console.error('Create SOP error:', error);
    res.status(500).json({ error: 'Failed to create SOP' });
  }
});

// Update SOP
router.put('/sops/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { title, category, content, version, isActive } = req.body;

    const sop = await req.prisma.sOP.update({
      where: { id: req.params.id },
      data: { title, category, content, version, isActive }
    });

    res.json(sop);
  } catch (error) {
    console.error('Update SOP error:', error);
    res.status(500).json({ error: 'Failed to update SOP' });
  }
});

// Delete SOP
router.delete('/sops/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.sOP.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'SOP deleted successfully' });
  } catch (error) {
    console.error('Delete SOP error:', error);
    res.status(500).json({ error: 'Failed to delete SOP' });
  }
});

// Bulk delete SOPs
router.post('/sops/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await req.prisma.sOP.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false }
    });

    res.json({ message: 'SOPs deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete SOPs error:', error);
    res.status(500).json({ error: 'Failed to bulk delete SOPs' });
  }
});

// Bulk update SOPs
router.post('/sops/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const result = await req.prisma.sOP.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: 'SOPs updated successfully', count: result.count });
  } catch (error) {
    console.error('Bulk update SOPs error:', error);
    res.status(500).json({ error: 'Failed to bulk update SOPs' });
  }
});

// =====================
// Operational Checklists
// =====================

// Get all operational checklists
router.get('/checklists', authenticateToken, async (req, res) => {
  try {
    const { category, frequency, isActive } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (category) where.category = category;
    if (frequency) where.frequency = frequency;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [checklists, total] = await Promise.all([
      req.prisma.operationalChecklist.findMany({
        where,
        include: {
          items: { orderBy: { order: 'asc' } },
          _count: { select: { completions: true } }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.operationalChecklist.count({ where })
    ]);

    res.json(paginatedResponse(checklists, total, page, limit));
  } catch (error) {
    console.error('Get checklists error:', error);
    res.status(500).json({ error: 'Failed to get checklists' });
  }
});

// Get checklist by ID
router.get('/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const checklist = await req.prisma.operationalChecklist.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { order: 'asc' } } }
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    res.json(checklist);
  } catch (error) {
    console.error('Get checklist error:', error);
    res.status(500).json({ error: 'Failed to get checklist' });
  }
});

// Create operational checklist
router.post('/checklists', authenticateToken, isCorporate, [
  body('name').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('frequency').isIn(['daily', 'weekly', 'monthly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category, frequency, description, items } = req.body;

    const checklist = await req.prisma.operationalChecklist.create({
      data: {
        name,
        category,
        frequency,
        description,
        items: items && items.length > 0 ? {
          create: items.map((item, index) => ({
            item: item.item,
            description: item.description,
            order: index
          }))
        } : undefined
      },
      include: { items: { orderBy: { order: 'asc' } } }
    });

    res.status(201).json(checklist);
  } catch (error) {
    console.error('Create checklist error:', error);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

// Update operational checklist
router.put('/checklists/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { name, category, frequency, description, isActive, items } = req.body;

    await req.prisma.operationalChecklist.update({
      where: { id: req.params.id },
      data: { name, category, frequency, description, isActive }
    });

    if (items) {
      await req.prisma.operationalChecklistItem.deleteMany({
        where: { checklistId: req.params.id }
      });

      await req.prisma.operationalChecklistItem.createMany({
        data: items.map((item, index) => ({
          checklistId: req.params.id,
          item: item.item,
          description: item.description,
          order: index
        }))
      });
    }

    const updatedChecklist = await req.prisma.operationalChecklist.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { order: 'asc' } } }
    });

    res.json(updatedChecklist);
  } catch (error) {
    console.error('Update checklist error:', error);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// Delete operational checklist
router.delete('/checklists/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.operationalChecklist.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Checklist deleted successfully' });
  } catch (error) {
    console.error('Delete checklist error:', error);
    res.status(500).json({ error: 'Failed to delete checklist' });
  }
});

// Complete checklist
router.post('/checklists/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { locationId, itemsCompleted, notes } = req.body;

    const completion = await req.prisma.checklistCompletion.create({
      data: {
        checklistId: req.params.id,
        locationId,
        completedBy: req.user.id,
        itemsCompleted,
        notes
      },
      include: {
        checklist: true,
        location: { select: { id: true, name: true, code: true } }
      }
    });

    res.status(201).json(completion);
  } catch (error) {
    console.error('Complete checklist error:', error);
    res.status(500).json({ error: 'Failed to complete checklist' });
  }
});

// Get checklist completions
router.get('/checklists/:id/completions', authenticateToken, async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.query;

    const where = { checklistId: req.params.id };
    if (locationId) where.locationId = locationId;
    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt.gte = new Date(startDate);
      if (endDate) where.completedAt.lte = new Date(endDate);
    }

    const completions = await req.prisma.checklistCompletion.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, code: true } }
      },
      orderBy: { completedAt: 'desc' }
    });

    res.json(completions);
  } catch (error) {
    console.error('Get completions error:', error);
    res.status(500).json({ error: 'Failed to get completions' });
  }
});

// =====================
// Compliance Audits
// =====================

// Get all audits
router.get('/audits', authenticateToken, async (req, res) => {
  try {
    const { locationId, status, startDate, endDate } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) where.scheduledDate.gte = new Date(startDate);
      if (endDate) where.scheduledDate.lte = new Date(endDate);
    }

    // Location managers can only see their location's audits
    if (req.user.role === 'LOCATION_MANAGER' && req.user.locationId) {
      where.locationId = req.user.locationId;
    }

    const [audits, total] = await Promise.all([
      req.prisma.complianceAudit.findMany({
        where,
        include: {
          location: { select: { id: true, name: true, code: true } },
          checklist: { select: { id: true, name: true, category: true } }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.complianceAudit.count({ where })
    ]);

    res.json(paginatedResponse(audits, total, page, limit));
  } catch (error) {
    console.error('Get audits error:', error);
    res.status(500).json({ error: 'Failed to get audits' });
  }
});

// Get audit by ID
router.get('/audits/:id', authenticateToken, async (req, res) => {
  try {
    const audit = await req.prisma.complianceAudit.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        checklist: { include: { items: { orderBy: { order: 'asc' } } } }
      }
    });

    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    res.json(audit);
  } catch (error) {
    console.error('Get audit error:', error);
    res.status(500).json({ error: 'Failed to get audit' });
  }
});

// Schedule audit
router.post('/audits', authenticateToken, isCorporate, [
  body('locationId').notEmpty(),
  body('checklistId').notEmpty(),
  body('scheduledDate').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { locationId, checklistId, scheduledDate, auditor } = req.body;

    const audit = await req.prisma.complianceAudit.create({
      data: {
        locationId,
        checklistId,
        scheduledDate: new Date(scheduledDate),
        auditor
      },
      include: {
        location: { select: { id: true, name: true, code: true } },
        checklist: { select: { id: true, name: true, category: true } }
      }
    });

    res.status(201).json(audit);
  } catch (error) {
    console.error('Create audit error:', error);
    res.status(500).json({ error: 'Failed to create audit' });
  }
});

// Update audit (complete audit)
router.put('/audits/:id', authenticateToken, isManager, async (req, res) => {
  try {
    const { status, score, findings, auditor, completedDate } = req.body;

    const audit = await req.prisma.complianceAudit.update({
      where: { id: req.params.id },
      data: {
        status,
        score,
        findings,
        auditor,
        completedDate: completedDate ? new Date(completedDate) : (status === 'COMPLETED' ? new Date() : undefined)
      },
      include: {
        location: { select: { id: true, name: true, code: true } },
        checklist: { select: { id: true, name: true, category: true } }
      }
    });

    res.json(audit);
  } catch (error) {
    console.error('Update audit error:', error);
    res.status(500).json({ error: 'Failed to update audit' });
  }
});

// Delete audit
router.delete('/audits/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.complianceAudit.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Audit deleted successfully' });
  } catch (error) {
    console.error('Delete audit error:', error);
    res.status(500).json({ error: 'Failed to delete audit' });
  }
});

// Bulk delete audits
router.post('/audits/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await req.prisma.complianceAudit.deleteMany({
      where: { id: { in: ids } }
    });

    res.json({ message: 'Audits deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete audits error:', error);
    res.status(500).json({ error: 'Failed to bulk delete audits' });
  }
});

// Bulk update audits
router.post('/audits/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const result = await req.prisma.complianceAudit.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: 'Audits updated successfully', count: result.count });
  } catch (error) {
    console.error('Bulk update audits error:', error);
    res.status(500).json({ error: 'Failed to bulk update audits' });
  }
});

// =====================
// Issue Reports
// =====================

// Get all issue reports
router.get('/issues', authenticateToken, async (req, res) => {
  try {
    const { locationId, category, priority, status } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (locationId) where.locationId = locationId;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (status) where.status = status;

    // Location managers can only see their location's issues
    if (req.user.role === 'LOCATION_MANAGER' && req.user.locationId) {
      where.locationId = req.user.locationId;
    }

    const [issues, total] = await Promise.all([
      req.prisma.issueReport.findMany({
        where,
        include: {
          location: { select: { id: true, name: true, code: true } },
          reporter: { select: { id: true, firstName: true, lastName: true } }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.issueReport.count({ where })
    ]);

    res.json(paginatedResponse(issues, total, page, limit));
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Failed to get issues' });
  }
});

// Get issue by ID
router.get('/issues/:id', authenticateToken, async (req, res) => {
  try {
    const issue = await req.prisma.issueReport.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(issue);
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ error: 'Failed to get issue' });
  }
});

// Create issue report
router.post('/issues', authenticateToken, [
  body('locationId').notEmpty(),
  body('title').notEmpty().trim(),
  body('description').notEmpty(),
  body('category').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { locationId, title, description, category, priority } = req.body;

    const issue = await req.prisma.issueReport.create({
      data: {
        locationId,
        reportedBy: req.user.id,
        title,
        description,
        category,
        priority: priority || 'MEDIUM'
      },
      include: {
        location: { select: { id: true, name: true, code: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json(issue);
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// Update issue
router.put('/issues/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, priority, status, resolution } = req.body;

    const updateData = { title, description, category, priority, status, resolution };
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    const issue = await req.prisma.issueReport.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        location: { select: { id: true, name: true, code: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json(issue);
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// Delete issue
router.delete('/issues/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.issueReport.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

// Bulk delete issues
router.post('/issues/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await req.prisma.issueReport.deleteMany({
      where: { id: { in: ids } }
    });

    res.json({ message: 'Issues deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete issues error:', error);
    res.status(500).json({ error: 'Failed to bulk delete issues' });
  }
});

// Bulk update issues
router.post('/issues/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const result = await req.prisma.issueReport.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: 'Issues updated successfully', count: result.count });
  } catch (error) {
    console.error('Bulk update issues error:', error);
    res.status(500).json({ error: 'Failed to bulk update issues' });
  }
});

// =====================
// Best Practices
// =====================

// Get all best practices
router.get('/best-practices', authenticateToken, async (req, res) => {
  try {
    const { category, isApproved } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (category) where.category = category;
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';

    const [practices, total] = await Promise.all([
      req.prisma.bestPractice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.bestPractice.count({ where })
    ]);

    res.json(paginatedResponse(practices, total, page, limit));
  } catch (error) {
    console.error('Get best practices error:', error);
    res.status(500).json({ error: 'Failed to get best practices' });
  }
});

// Get best practice by ID
router.get('/best-practices/:id', authenticateToken, async (req, res) => {
  try {
    const practice = await req.prisma.bestPractice.findUnique({
      where: { id: req.params.id }
    });

    if (!practice) {
      return res.status(404).json({ error: 'Best practice not found' });
    }

    res.json(practice);
  } catch (error) {
    console.error('Get best practice error:', error);
    res.status(500).json({ error: 'Failed to get best practice' });
  }
});

// Create best practice
router.post('/best-practices', authenticateToken, [
  body('title').notEmpty().trim(),
  body('category').notEmpty().trim(),
  body('description').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, category, description, impact, implementedBy } = req.body;

    const practice = await req.prisma.bestPractice.create({
      data: { title, category, description, impact, implementedBy }
    });

    res.status(201).json(practice);
  } catch (error) {
    console.error('Create best practice error:', error);
    res.status(500).json({ error: 'Failed to create best practice' });
  }
});

// Update best practice
router.put('/best-practices/:id', authenticateToken, async (req, res) => {
  try {
    const { title, category, description, impact, implementedBy, isApproved } = req.body;

    // Only corporate can approve
    const updateData = { title, category, description, impact, implementedBy };
    if (['SUPER_ADMIN', 'CORPORATE_ADMIN'].includes(req.user.role)) {
      updateData.isApproved = isApproved;
    }

    const practice = await req.prisma.bestPractice.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(practice);
  } catch (error) {
    console.error('Update best practice error:', error);
    res.status(500).json({ error: 'Failed to update best practice' });
  }
});

// Delete best practice
router.delete('/best-practices/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.bestPractice.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Best practice deleted successfully' });
  } catch (error) {
    console.error('Delete best practice error:', error);
    res.status(500).json({ error: 'Failed to delete best practice' });
  }
});

// Bulk delete best practices
router.post('/best-practices/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await req.prisma.bestPractice.deleteMany({
      where: { id: { in: ids } }
    });

    res.json({ message: 'Best practices deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete best practices error:', error);
    res.status(500).json({ error: 'Failed to bulk delete best practices' });
  }
});

// Bulk update best practices
router.post('/best-practices/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const result = await req.prisma.bestPractice.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: 'Best practices updated successfully', count: result.count });
  } catch (error) {
    console.error('Bulk update best practices error:', error);
    res.status(500).json({ error: 'Failed to bulk update best practices' });
  }
});

// Get operations metadata
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const [sopCategories, checklistCategories, issueCategories, practiceCategories] = await Promise.all([
      req.prisma.sOP.findMany({ select: { category: true }, distinct: ['category'] }),
      req.prisma.operationalChecklist.findMany({ select: { category: true }, distinct: ['category'] }),
      req.prisma.issueReport.findMany({ select: { category: true }, distinct: ['category'] }),
      req.prisma.bestPractice.findMany({ select: { category: true }, distinct: ['category'] })
    ]);

    res.json({
      sops: sopCategories.map(c => c.category),
      checklists: checklistCategories.map(c => c.category),
      issues: issueCategories.map(c => c.category),
      practices: practiceCategories.map(c => c.category)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

module.exports = router;
