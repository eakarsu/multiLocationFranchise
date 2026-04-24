const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, isCorporate, isManager } = require('../middleware/auth');
const { getPaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();

// =====================
// Financial Data
// =====================

// Get financial data for all locations
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const { locationId, startDate, endDate, year, month } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (locationId) where.locationId = locationId;

    // Location managers can only see their location's data
    if (req.user.role === 'LOCATION_MANAGER' && req.user.locationId) {
      where.locationId = req.user.locationId;
    }

    if (startDate || endDate) {
      where.period = {};
      if (startDate) where.period.gte = new Date(startDate);
      if (endDate) where.period.lte = new Date(endDate);
    } else if (year) {
      const yearInt = parseInt(year);
      const monthInt = month ? parseInt(month) - 1 : 0;
      where.period = {
        gte: new Date(yearInt, month ? monthInt : 0, 1),
        lt: new Date(yearInt, month ? monthInt + 1 : 12, 1)
      };
    }

    const [financialData, total] = await Promise.all([
      req.prisma.financialData.findMany({
        where,
        include: {
          location: { select: { id: true, name: true, code: true } }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.financialData.count({ where })
    ]);

    res.json(paginatedResponse(financialData, total, page, limit));
  } catch (error) {
    console.error('Get financial data error:', error);
    res.status(500).json({ error: 'Failed to get financial data' });
  }
});

// Get financial data by ID
router.get('/data/:id', authenticateToken, async (req, res) => {
  try {
    const data = await req.prisma.financialData.findUnique({
      where: { id: req.params.id },
      include: { location: true }
    });

    if (!data) {
      return res.status(404).json({ error: 'Financial data not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get financial data error:', error);
    res.status(500).json({ error: 'Failed to get financial data' });
  }
});

// Create/Update financial data
router.post('/data', authenticateToken, isManager, [
  body('locationId').notEmpty(),
  body('period').isISO8601(),
  body('revenue').isFloat({ min: 0 }),
  body('cogs').isFloat({ min: 0 }),
  body('laborCost').isFloat({ min: 0 }),
  body('operatingExpenses').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { locationId, period, revenue, cogs, laborCost, operatingExpenses, royaltyPaid } = req.body;

    // Calculate net profit
    const netProfit = revenue - cogs - laborCost - operatingExpenses;

    // Calculate royalty (assuming 5% of revenue)
    const royaltyDue = revenue * 0.05;

    const periodDate = new Date(period);
    periodDate.setDate(1); // Normalize to first of month

    const financialData = await req.prisma.financialData.upsert({
      where: {
        locationId_period: { locationId, period: periodDate }
      },
      update: {
        revenue,
        cogs,
        laborCost,
        operatingExpenses,
        netProfit,
        royaltyDue,
        royaltyPaid: royaltyPaid || 0
      },
      create: {
        locationId,
        period: periodDate,
        revenue,
        cogs,
        laborCost,
        operatingExpenses,
        netProfit,
        royaltyDue,
        royaltyPaid: royaltyPaid || 0
      },
      include: { location: { select: { id: true, name: true, code: true } } }
    });

    res.json(financialData);
  } catch (error) {
    console.error('Create financial data error:', error);
    res.status(500).json({ error: 'Failed to create financial data' });
  }
});

// Delete financial data
router.delete('/data/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    await req.prisma.financialData.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Financial data deleted successfully' });
  } catch (error) {
    console.error('Delete financial data error:', error);
    res.status(500).json({ error: 'Failed to delete financial data' });
  }
});

// Bulk delete financial data
router.post('/data/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await req.prisma.financialData.deleteMany({
      where: { id: { in: ids } }
    });

    res.json({ message: 'Financial data deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete financial data error:', error);
    res.status(500).json({ error: 'Failed to bulk delete financial data' });
  }
});

// Bulk update financial data
router.post('/data/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const result = await req.prisma.financialData.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: 'Financial data updated successfully', count: result.count });
  } catch (error) {
    console.error('Bulk update financial data error:', error);
    res.status(500).json({ error: 'Failed to bulk update financial data' });
  }
});

// =====================
// Royalty Payments
// =====================

// Get all royalty payments
router.get('/royalties', authenticateToken, async (req, res) => {
  try {
    const { locationId, status, startDate, endDate } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(req.query);

    const where = {};
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.period = {};
      if (startDate) where.period.gte = new Date(startDate);
      if (endDate) where.period.lte = new Date(endDate);
    }

    // Location managers can only see their location's payments
    if (req.user.role === 'LOCATION_MANAGER' && req.user.locationId) {
      where.locationId = req.user.locationId;
    }

    const [payments, total] = await Promise.all([
      req.prisma.royaltyPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      req.prisma.royaltyPayment.count({ where })
    ]);

    // Get location info
    const locationIds = [...new Set(payments.map(p => p.locationId))];
    const locations = await req.prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true, code: true }
    });
    const locationMap = Object.fromEntries(locations.map(l => [l.id, l]));

    const paymentsWithLocation = payments.map(p => ({
      ...p,
      location: locationMap[p.locationId]
    }));

    res.json(paginatedResponse(paymentsWithLocation, total, page, limit));
  } catch (error) {
    console.error('Get royalties error:', error);
    res.status(500).json({ error: 'Failed to get royalties' });
  }
});

// Create royalty payment record
router.post('/royalties', authenticateToken, isCorporate, [
  body('locationId').notEmpty(),
  body('period').isISO8601(),
  body('amountDue').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { locationId, period, amountDue, amountPaid, paidDate, status } = req.body;

    const payment = await req.prisma.royaltyPayment.create({
      data: {
        locationId,
        period: new Date(period),
        amountDue,
        amountPaid: amountPaid || 0,
        paidDate: paidDate ? new Date(paidDate) : null,
        status: status || 'PENDING'
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Create royalty payment error:', error);
    res.status(500).json({ error: 'Failed to create royalty payment' });
  }
});

// Update royalty payment
router.put('/royalties/:id', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { amountPaid, paidDate, status } = req.body;

    const payment = await req.prisma.royaltyPayment.update({
      where: { id: req.params.id },
      data: {
        amountPaid,
        paidDate: paidDate ? new Date(paidDate) : undefined,
        status
      }
    });

    res.json(payment);
  } catch (error) {
    console.error('Update royalty payment error:', error);
    res.status(500).json({ error: 'Failed to update royalty payment' });
  }
});

// Bulk delete royalty payments
router.post('/royalties/bulk-delete', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await req.prisma.royaltyPayment.deleteMany({
      where: { id: { in: ids } }
    });

    res.json({ message: 'Royalty payments deleted successfully', count: result.count });
  } catch (error) {
    console.error('Bulk delete royalties error:', error);
    res.status(500).json({ error: 'Failed to bulk delete royalty payments' });
  }
});

// Bulk update royalty payments
router.post('/royalties/bulk-update', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { ids, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data object is required' });
    }

    const result = await req.prisma.royaltyPayment.updateMany({
      where: { id: { in: ids } },
      data
    });

    res.json({ message: 'Royalty payments updated successfully', count: result.count });
  } catch (error) {
    console.error('Bulk update royalties error:', error);
    res.status(500).json({ error: 'Failed to bulk update royalty payments' });
  }
});

// =====================
// P&L Reports
// =====================

// Get P&L summary by location
router.get('/pnl/summary', authenticateToken, async (req, res) => {
  try {
    const { year, locationId } = req.query;

    const yearInt = parseInt(year) || new Date().getFullYear();

    const where = {
      period: {
        gte: new Date(yearInt, 0, 1),
        lt: new Date(yearInt + 1, 0, 1)
      }
    };

    if (locationId) where.locationId = locationId;

    // Location managers can only see their location's data
    if (req.user.role === 'LOCATION_MANAGER' && req.user.locationId) {
      where.locationId = req.user.locationId;
    }

    const financialData = await req.prisma.financialData.findMany({
      where,
      include: { location: { select: { id: true, name: true, code: true } } }
    });

    // Group by location and calculate totals
    const locationSummaries = {};
    financialData.forEach(data => {
      if (!locationSummaries[data.locationId]) {
        locationSummaries[data.locationId] = {
          location: data.location,
          totalRevenue: 0,
          totalCogs: 0,
          totalLaborCost: 0,
          totalOperatingExpenses: 0,
          totalNetProfit: 0,
          totalRoyaltyDue: 0,
          totalRoyaltyPaid: 0,
          monthlyData: []
        };
      }

      const summary = locationSummaries[data.locationId];
      summary.totalRevenue += data.revenue;
      summary.totalCogs += data.cogs;
      summary.totalLaborCost += data.laborCost;
      summary.totalOperatingExpenses += data.operatingExpenses;
      summary.totalNetProfit += data.netProfit;
      summary.totalRoyaltyDue += data.royaltyDue;
      summary.totalRoyaltyPaid += data.royaltyPaid;
      summary.monthlyData.push(data);
    });

    // Calculate margins
    Object.values(locationSummaries).forEach(summary => {
      summary.grossMargin = summary.totalRevenue > 0
        ? ((summary.totalRevenue - summary.totalCogs) / summary.totalRevenue * 100).toFixed(2)
        : 0;
      summary.netMargin = summary.totalRevenue > 0
        ? (summary.totalNetProfit / summary.totalRevenue * 100).toFixed(2)
        : 0;
    });

    res.json(Object.values(locationSummaries));
  } catch (error) {
    console.error('Get P&L summary error:', error);
    res.status(500).json({ error: 'Failed to get P&L summary' });
  }
});

// =====================
// Benchmarking
// =====================

// Get financial benchmarks
router.get('/benchmarks', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;

    const yearInt = parseInt(year) || new Date().getFullYear();
    const monthInt = month ? parseInt(month) - 1 : new Date().getMonth();

    const periodStart = new Date(yearInt, monthInt, 1);
    const periodEnd = new Date(yearInt, monthInt + 1, 1);

    const financialData = await req.prisma.financialData.findMany({
      where: {
        period: { gte: periodStart, lt: periodEnd }
      },
      include: { location: { select: { id: true, name: true, code: true, territory: true } } }
    });

    if (financialData.length === 0) {
      return res.json({ message: 'No data for the selected period', benchmarks: null });
    }

    // Calculate benchmarks
    const revenues = financialData.map(d => d.revenue);
    const netProfits = financialData.map(d => d.netProfit);
    const margins = financialData.map(d => d.revenue > 0 ? (d.netProfit / d.revenue * 100) : 0);

    const benchmarks = {
      period: { year: yearInt, month: monthInt + 1 },
      locationCount: financialData.length,
      revenue: {
        average: revenues.reduce((a, b) => a + b, 0) / revenues.length,
        min: Math.min(...revenues),
        max: Math.max(...revenues),
        median: getMedian(revenues)
      },
      netProfit: {
        average: netProfits.reduce((a, b) => a + b, 0) / netProfits.length,
        min: Math.min(...netProfits),
        max: Math.max(...netProfits),
        median: getMedian(netProfits)
      },
      netMargin: {
        average: margins.reduce((a, b) => a + b, 0) / margins.length,
        min: Math.min(...margins),
        max: Math.max(...margins),
        median: getMedian(margins)
      },
      locations: financialData.map(d => ({
        location: d.location,
        revenue: d.revenue,
        netProfit: d.netProfit,
        netMargin: d.revenue > 0 ? (d.netProfit / d.revenue * 100).toFixed(2) : 0
      })).sort((a, b) => b.revenue - a.revenue)
    };

    res.json(benchmarks);
  } catch (error) {
    console.error('Get benchmarks error:', error);
    res.status(500).json({ error: 'Failed to get benchmarks' });
  }
});

// Helper function for median
function getMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// =====================
// Performance Data
// =====================

// Get performance data
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.query;

    const where = {};
    if (locationId) where.locationId = locationId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Location managers can only see their location's data
    if (req.user.role === 'LOCATION_MANAGER' && req.user.locationId) {
      where.locationId = req.user.locationId;
    }

    const performanceData = await req.prisma.performanceData.findMany({
      where,
      include: { location: { select: { id: true, name: true, code: true } } },
      orderBy: [{ date: 'desc' }, { locationId: 'asc' }]
    });

    res.json(performanceData);
  } catch (error) {
    console.error('Get performance data error:', error);
    res.status(500).json({ error: 'Failed to get performance data' });
  }
});

// Create/Update performance data
router.post('/performance', authenticateToken, isManager, [
  body('locationId').notEmpty(),
  body('date').isISO8601(),
  body('salesAmount').isFloat({ min: 0 }),
  body('transactionCount').isInt({ min: 0 }),
  body('customerCount').isInt({ min: 0 }),
  body('laborHours').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { locationId, date, salesAmount, transactionCount, customerCount, laborHours, customerSatisfaction } = req.body;

    const averageTicket = transactionCount > 0 ? salesAmount / transactionCount : 0;
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const performanceData = await req.prisma.performanceData.upsert({
      where: {
        locationId_date: { locationId, date: dateObj }
      },
      update: {
        salesAmount,
        transactionCount,
        averageTicket,
        customerCount,
        laborHours,
        customerSatisfaction
      },
      create: {
        locationId,
        date: dateObj,
        salesAmount,
        transactionCount,
        averageTicket,
        customerCount,
        laborHours,
        customerSatisfaction
      },
      include: { location: { select: { id: true, name: true, code: true } } }
    });

    res.json(performanceData);
  } catch (error) {
    console.error('Create performance data error:', error);
    res.status(500).json({ error: 'Failed to create performance data' });
  }
});

// Get financial summary statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const where = {
      period: {
        gte: new Date(currentYear, 0, 1),
        lt: new Date(currentYear + 1, 0, 1)
      }
    };

    // Location managers can only see their location's data
    if (req.user.role === 'LOCATION_MANAGER' && req.user.locationId) {
      where.locationId = req.user.locationId;
    }

    const [ytdData, mtdData, overdueRoyalties] = await Promise.all([
      req.prisma.financialData.aggregate({
        where,
        _sum: { revenue: true, netProfit: true, royaltyDue: true, royaltyPaid: true }
      }),
      req.prisma.financialData.aggregate({
        where: {
          ...where,
          period: {
            gte: new Date(currentYear, currentMonth, 1),
            lt: new Date(currentYear, currentMonth + 1, 1)
          }
        },
        _sum: { revenue: true, netProfit: true }
      }),
      req.prisma.royaltyPayment.count({
        where: { status: 'OVERDUE' }
      })
    ]);

    res.json({
      ytd: {
        revenue: ytdData._sum.revenue || 0,
        netProfit: ytdData._sum.netProfit || 0,
        royaltyDue: ytdData._sum.royaltyDue || 0,
        royaltyPaid: ytdData._sum.royaltyPaid || 0
      },
      mtd: {
        revenue: mtdData._sum.revenue || 0,
        netProfit: mtdData._sum.netProfit || 0
      },
      overdueRoyalties
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
