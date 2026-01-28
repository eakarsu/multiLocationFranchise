const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// All enum values - these match the Prisma schema
const ENUMS = {
  userRoles: [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'CORPORATE_ADMIN', label: 'Corporate Admin' },
    { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
    { value: 'LOCATION_MANAGER', label: 'Location Manager' },
    { value: 'STAFF', label: 'Staff' }
  ],
  locationStatuses: [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'SUSPENDED', label: 'Suspended' }
  ],
  auditStatuses: [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ],
  priorities: [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
  ],
  issueStatuses: [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'CLOSED', label: 'Closed' }
  ],
  paymentStatuses: [
    { value: 'PENDING', label: 'Pending' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'PARTIAL', label: 'Partial' }
  ],
  ticketStatuses: [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'WAITING_ON_CUSTOMER', label: 'Waiting on Customer' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'CLOSED', label: 'Closed' }
  ],
  contentTypes: [
    { value: 'video', label: 'Video' },
    { value: 'document', label: 'Document' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'presentation', label: 'Presentation' },
    { value: 'interactive', label: 'Interactive' }
  ],
  frequencies: [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' }
  ],
  aiAnalysisTypes: [
    { value: 'PERFORMANCE_ANALYSIS', label: 'Performance Analysis' },
    { value: 'BENCHMARKING', label: 'Benchmarking' },
    { value: 'COMPLIANCE_CHECK', label: 'Compliance Check' },
    { value: 'DEMAND_FORECAST', label: 'Demand Forecast' },
    { value: 'BEST_PRACTICE', label: 'Best Practice' },
    { value: 'ANOMALY_DETECTION', label: 'Anomaly Detection' },
    { value: 'REPORT_GENERATION', label: 'Report Generation' }
  ]
};

// Get all enums (no auth required for dropdowns)
router.get('/enums', (req, res) => {
  res.json(ENUMS);
});

// Get specific enum
router.get('/enums/:enumName', (req, res) => {
  const { enumName } = req.params;
  if (ENUMS[enumName]) {
    res.json(ENUMS[enumName]);
  } else {
    res.status(404).json({ error: `Enum '${enumName}' not found` });
  }
});

// Get categories from database - dynamically fetched
router.get('/categories/products', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isActive: true }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: 'Failed to fetch product categories' });
  }
});

router.get('/categories/brand-guidelines', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.brandGuideline.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isActive: true }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching brand guideline categories:', error);
    res.status(500).json({ error: 'Failed to fetch brand guideline categories' });
  }
});

router.get('/categories/marketing-templates', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.marketingTemplate.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isActive: true }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching marketing template categories:', error);
    res.status(500).json({ error: 'Failed to fetch marketing template categories' });
  }
});

router.get('/categories/approved-vendors', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.approvedVendor.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isActive: true }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching approved vendor categories:', error);
    res.status(500).json({ error: 'Failed to fetch approved vendor categories' });
  }
});

router.get('/categories/training-materials', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.trainingMaterial.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isActive: true }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching training material categories:', error);
    res.status(500).json({ error: 'Failed to fetch training material categories' });
  }
});

router.get('/categories/compliance-checklists', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.complianceChecklist.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isActive: true }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching compliance checklist categories:', error);
    res.status(500).json({ error: 'Failed to fetch compliance checklist categories' });
  }
});

router.get('/categories/sops', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.sOP.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isActive: true }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching SOP categories:', error);
    res.status(500).json({ error: 'Failed to fetch SOP categories' });
  }
});

router.get('/categories/operational-checklists', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.operationalChecklist.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isActive: true }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching operational checklist categories:', error);
    res.status(500).json({ error: 'Failed to fetch operational checklist categories' });
  }
});

router.get('/categories/best-practices', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.bestPractice.findMany({
      select: { category: true },
      distinct: ['category']
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching best practice categories:', error);
    res.status(500).json({ error: 'Failed to fetch best practice categories' });
  }
});

router.get('/categories/issue-reports', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.issueReport.findMany({
      select: { category: true },
      distinct: ['category']
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching issue report categories:', error);
    res.status(500).json({ error: 'Failed to fetch issue report categories' });
  }
});

router.get('/categories/knowledge-articles', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.knowledgeArticle.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { isPublished: true }
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching knowledge article categories:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge article categories' });
  }
});

router.get('/categories/support-tickets', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.supportTicket.findMany({
      select: { category: true },
      distinct: ['category']
    });
    res.json(categories.map(c => ({ value: c.category, label: c.category })));
  } catch (error) {
    console.error('Error fetching support ticket categories:', error);
    res.status(500).json({ error: 'Failed to fetch support ticket categories' });
  }
});

// Get all categories at once
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const [
      products,
      brandGuidelines,
      marketingTemplates,
      approvedVendors,
      trainingMaterials,
      complianceChecklists,
      sops,
      operationalChecklists,
      bestPractices,
      issueReports,
      knowledgeArticles,
      supportTickets
    ] = await Promise.all([
      req.prisma.product.findMany({ select: { category: true }, distinct: ['category'], where: { isActive: true } }),
      req.prisma.brandGuideline.findMany({ select: { category: true }, distinct: ['category'], where: { isActive: true } }),
      req.prisma.marketingTemplate.findMany({ select: { category: true }, distinct: ['category'], where: { isActive: true } }),
      req.prisma.approvedVendor.findMany({ select: { category: true }, distinct: ['category'], where: { isActive: true } }),
      req.prisma.trainingMaterial.findMany({ select: { category: true }, distinct: ['category'], where: { isActive: true } }),
      req.prisma.complianceChecklist.findMany({ select: { category: true }, distinct: ['category'], where: { isActive: true } }),
      req.prisma.sOP.findMany({ select: { category: true }, distinct: ['category'], where: { isActive: true } }),
      req.prisma.operationalChecklist.findMany({ select: { category: true }, distinct: ['category'], where: { isActive: true } }),
      req.prisma.bestPractice.findMany({ select: { category: true }, distinct: ['category'] }),
      req.prisma.issueReport.findMany({ select: { category: true }, distinct: ['category'] }),
      req.prisma.knowledgeArticle.findMany({ select: { category: true }, distinct: ['category'], where: { isPublished: true } }),
      req.prisma.supportTicket.findMany({ select: { category: true }, distinct: ['category'] })
    ]);

    res.json({
      products: products.map(c => ({ value: c.category, label: c.category })),
      brandGuidelines: brandGuidelines.map(c => ({ value: c.category, label: c.category })),
      marketingTemplates: marketingTemplates.map(c => ({ value: c.category, label: c.category })),
      approvedVendors: approvedVendors.map(c => ({ value: c.category, label: c.category })),
      trainingMaterials: trainingMaterials.map(c => ({ value: c.category, label: c.category })),
      complianceChecklists: complianceChecklists.map(c => ({ value: c.category, label: c.category })),
      sops: sops.map(c => ({ value: c.category, label: c.category })),
      operationalChecklists: operationalChecklists.map(c => ({ value: c.category, label: c.category })),
      bestPractices: bestPractices.map(c => ({ value: c.category, label: c.category })),
      issueReports: issueReports.map(c => ({ value: c.category, label: c.category })),
      knowledgeArticles: knowledgeArticles.map(c => ({ value: c.category, label: c.category })),
      supportTickets: supportTickets.map(c => ({ value: c.category, label: c.category }))
    });
  } catch (error) {
    console.error('Error fetching all categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
