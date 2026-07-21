const express = require('express');
const { authenticateToken, isCorporate } = require('../middleware/auth');

const router = express.Router();

// Get corporate dashboard overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Get location stats
    const [totalLocations, activeLocations, pendingLocations] = await Promise.all([
      req.prisma.location.count(),
      req.prisma.location.count({ where: { status: 'ACTIVE' } }),
      req.prisma.location.count({ where: { status: 'PENDING' } })
    ]);

    // Get user stats
    const totalUsers = await req.prisma.user.count({ where: { isActive: true } });

    // Get financial stats for current month
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 1);

    const financialStats = await req.prisma.financialData.aggregate({
      where: {
        period: { gte: monthStart, lt: monthEnd }
      },
      _sum: { revenue: true, netProfit: true },
      _avg: { revenue: true, netProfit: true }
    });

    // Get YTD stats
    const ytdStats = await req.prisma.financialData.aggregate({
      where: {
        period: { gte: new Date(currentYear, 0, 1), lt: monthEnd }
      },
      _sum: { revenue: true, netProfit: true }
    });

    // Get compliance stats
    const [scheduledAudits, completedAudits, overdueAudits] = await Promise.all([
      req.prisma.complianceAudit.count({ where: { status: 'SCHEDULED' } }),
      req.prisma.complianceAudit.count({
        where: {
          status: 'COMPLETED',
          completedDate: { gte: new Date(currentYear, 0, 1) }
        }
      }),
      req.prisma.complianceAudit.count({
        where: {
          status: 'SCHEDULED',
          scheduledDate: { lt: currentDate }
        }
      })
    ]);

    // Get average compliance score
    const avgCompliance = await req.prisma.complianceAudit.aggregate({
      where: {
        status: 'COMPLETED',
        completedDate: { gte: new Date(currentYear, 0, 1) }
      },
      _avg: { score: true }
    });

    // Get issue stats
    const [openIssues, criticalIssues] = await Promise.all([
      req.prisma.issueReport.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      req.prisma.issueReport.count({ where: { status: 'OPEN', priority: 'CRITICAL' } })
    ]);

    // Get royalty stats
    const [pendingRoyalties, overdueRoyalties] = await Promise.all([
      req.prisma.royaltyPayment.count({ where: { status: 'PENDING' } }),
      req.prisma.royaltyPayment.count({ where: { status: 'OVERDUE' } })
    ]);

    res.json({
      locations: {
        total: totalLocations,
        active: activeLocations,
        pending: pendingLocations
      },
      users: {
        total: totalUsers
      },
      financial: {
        mtd: {
          revenue: financialStats._sum.revenue || 0,
          netProfit: financialStats._sum.netProfit || 0,
          avgRevenue: financialStats._avg.revenue || 0
        },
        ytd: {
          revenue: ytdStats._sum.revenue || 0,
          netProfit: ytdStats._sum.netProfit || 0
        }
      },
      compliance: {
        scheduled: scheduledAudits,
        completed: completedAudits,
        overdue: overdueAudits,
        avgScore: avgCompliance._avg.score || 0
      },
      issues: {
        open: openIssues,
        critical: criticalIssues
      },
      royalties: {
        pending: pendingRoyalties,
        overdue: overdueRoyalties
      }
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
});

// Get performance benchmarking data
router.get('/benchmarks', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { period } = req.query; // 'month', 'quarter', 'year'
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    let startDate;
    switch (period) {
      case 'quarter': {
        const quarterStart = Math.floor(currentMonth / 3) * 3;
        startDate = new Date(currentYear, quarterStart, 1);
        break;
      }
      case 'year':
        startDate = new Date(currentYear, 0, 1);
        break;
      default: // month
        startDate = new Date(currentYear, currentMonth, 1);
    }

    const performanceData = await req.prisma.performanceData.groupBy({
      by: ['locationId'],
      where: {
        date: { gte: startDate }
      },
      _sum: { salesAmount: true, transactionCount: true, customerCount: true },
      _avg: { averageTicket: true, customerSatisfaction: true }
    });

    // Get location details
    const locationIds = performanceData.map(p => p.locationId);
    const locations = await req.prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true, code: true, territory: true }
    });
    const locationMap = Object.fromEntries(locations.map(l => [l.id, l]));

    const benchmarks = performanceData.map(p => ({
      location: locationMap[p.locationId],
      totalSales: p._sum.salesAmount || 0,
      totalTransactions: p._sum.transactionCount || 0,
      totalCustomers: p._sum.customerCount || 0,
      avgTicket: p._avg.averageTicket || 0,
      avgSatisfaction: p._avg.customerSatisfaction || 0
    })).sort((a, b) => b.totalSales - a.totalSales);

    // Calculate rankings
    benchmarks.forEach((b, index) => {
      b.rank = index + 1;
    });

    // Calculate averages
    const totals = benchmarks.reduce((acc, b) => ({
      sales: acc.sales + b.totalSales,
      transactions: acc.transactions + b.totalTransactions,
      customers: acc.customers + b.totalCustomers,
      ticket: acc.ticket + b.avgTicket,
      satisfaction: acc.satisfaction + (b.avgSatisfaction || 0)
    }), { sales: 0, transactions: 0, customers: 0, ticket: 0, satisfaction: 0 });

    const count = benchmarks.length || 1;
    const averages = {
      avgSales: totals.sales / count,
      avgTransactions: totals.transactions / count,
      avgCustomers: totals.customers / count,
      avgTicket: totals.ticket / count,
      avgSatisfaction: totals.satisfaction / count
    };

    res.json({ benchmarks, averages, period });
  } catch (error) {
    console.error('Get benchmarks error:', error);
    res.status(500).json({ error: 'Failed to get benchmarks' });
  }
});

// Get system-wide analytics
router.get('/analytics', authenticateToken, isCorporate, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Monthly revenue trend
    const monthlyRevenue = await req.prisma.financialData.groupBy({
      by: ['period'],
      where: {
        period: { gte: new Date(currentYear, 0, 1) }
      },
      _sum: { revenue: true, netProfit: true },
      orderBy: { period: 'asc' }
    });

    // Location performance distribution
    const locationPerformance = await req.prisma.financialData.groupBy({
      by: ['locationId'],
      where: {
        period: { gte: new Date(currentYear, 0, 1) }
      },
      _sum: { revenue: true, netProfit: true }
    });

    // Get location details
    const locationIds = locationPerformance.map(p => p.locationId);
    const locations = await req.prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true, code: true }
    });
    const locationMap = Object.fromEntries(locations.map(l => [l.id, l]));

    // Compliance score trend
    const complianceScores = await req.prisma.complianceAudit.findMany({
      where: {
        status: 'COMPLETED',
        completedDate: { gte: new Date(currentYear, 0, 1) }
      },
      select: { completedDate: true, score: true },
      orderBy: { completedDate: 'asc' }
    });

    // Issue resolution stats
    const issueStats = await req.prisma.issueReport.groupBy({
      by: ['status'],
      _count: true
    });

    // Territory performance
    const territoryData = await req.prisma.territory.findMany({
      include: {
        locations: {
          select: { id: true }
        }
      }
    });

    const territoryPerformance = await Promise.all(
      territoryData.map(async (territory) => {
        const locationIds = territory.locations.map(l => l.id);
        if (locationIds.length === 0) {
          return { territory: territory.name, revenue: 0, locationCount: 0 };
        }

        const data = await req.prisma.financialData.aggregate({
          where: {
            locationId: { in: locationIds },
            period: { gte: new Date(currentYear, 0, 1) }
          },
          _sum: { revenue: true }
        });

        return {
          territory: territory.name,
          region: territory.region,
          revenue: data._sum.revenue || 0,
          locationCount: locationIds.length
        };
      })
    );

    res.json({
      monthlyRevenue: monthlyRevenue.map(m => ({
        period: m.period,
        revenue: m._sum.revenue || 0,
        netProfit: m._sum.netProfit || 0
      })),
      locationPerformance: locationPerformance.map(p => ({
        location: locationMap[p.locationId],
        revenue: p._sum.revenue || 0,
        netProfit: p._sum.netProfit || 0
      })).sort((a, b) => b.revenue - a.revenue),
      complianceScores,
      issueStats: Object.fromEntries(issueStats.map(s => [s.status, s._count])),
      territoryPerformance: territoryPerformance.sort((a, b) => b.revenue - a.revenue)
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get location-specific dashboard
router.get('/location/:id', authenticateToken, async (req, res) => {
  try {
    const locationId = req.params.id;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Check access
    if (req.user.role === 'LOCATION_MANAGER' && req.user.locationId !== locationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const location = await req.prisma.location.findUnique({
      where: { id: locationId },
      include: { territory: true }
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Get financial stats
    const [mtdFinancial, ytdFinancial] = await Promise.all([
      req.prisma.financialData.findFirst({
        where: {
          locationId,
          period: {
            gte: new Date(currentYear, currentMonth, 1),
            lt: new Date(currentYear, currentMonth + 1, 1)
          }
        }
      }),
      req.prisma.financialData.aggregate({
        where: {
          locationId,
          period: { gte: new Date(currentYear, 0, 1) }
        },
        _sum: { revenue: true, netProfit: true }
      })
    ]);

    // Get performance stats
    const recentPerformance = await req.prisma.performanceData.findMany({
      where: { locationId },
      orderBy: { date: 'desc' },
      take: 30
    });

    // Get compliance stats
    const [upcomingAudits, recentAudits] = await Promise.all([
      req.prisma.complianceAudit.findMany({
        where: { locationId, status: 'SCHEDULED' },
        include: { checklist: { select: { name: true } } },
        orderBy: { scheduledDate: 'asc' },
        take: 5
      }),
      req.prisma.complianceAudit.findMany({
        where: { locationId, status: 'COMPLETED' },
        include: { checklist: { select: { name: true } } },
        orderBy: { completedDate: 'desc' },
        take: 5
      })
    ]);

    // Get open issues
    const openIssues = await req.prisma.issueReport.findMany({
      where: { locationId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' }
    });

    // Get staff count
    const staffCount = await req.prisma.user.count({
      where: { locationId, isActive: true }
    });

    res.json({
      location,
      financial: {
        mtd: mtdFinancial || { revenue: 0, netProfit: 0 },
        ytd: {
          revenue: ytdFinancial._sum.revenue || 0,
          netProfit: ytdFinancial._sum.netProfit || 0
        }
      },
      performance: recentPerformance,
      compliance: {
        upcoming: upcomingAudits,
        recent: recentAudits,
        avgScore: recentAudits.length > 0
          ? recentAudits.reduce((sum, a) => sum + (a.score || 0), 0) / recentAudits.length
          : null
      },
      issues: openIssues,
      staffCount
    });
  } catch (error) {
    console.error('Get location dashboard error:', error);
    res.status(500).json({ error: 'Failed to get location dashboard' });
  }
});

// Get recent activity
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const where = {};
    if (req.user.role === 'LOCATION_MANAGER' && req.user.locationId) {
      where.locationId = req.user.locationId;
    }

    // Get recent audit logs
    const auditLogs = await req.prisma.auditLog.findMany({
      include: {
        user: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Get recent issues
    const recentIssues = await req.prisma.issueReport.findMany({
      where,
      include: {
        location: { select: { name: true, code: true } },
        reporter: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get recent announcements
    const recentAnnouncements = await req.prisma.announcement.findMany({
      where: { isPublished: true },
      include: {
        author: { select: { firstName: true, lastName: true } }
      },
      orderBy: { publishedAt: 'desc' },
      take: 5
    });

    res.json({
      auditLogs,
      recentIssues,
      recentAnnouncements
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

module.exports = router;
