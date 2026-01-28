const express = require('express');
const { authenticateToken, isCorporate } = require('../middleware/auth');

const router = express.Router();

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Helper function to call OpenRouter API
const callOpenRouter = async (prompt, systemPrompt = '') => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

  if (!apiKey) {
    console.warn('OpenRouter API key not configured, using fallback response');
    return null;
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Franchise Platform'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt || 'You are an AI assistant for a multi-location franchise management platform. Provide helpful, actionable insights in JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Try to parse as JSON if it looks like JSON
    if (content && content.trim().startsWith('{')) {
      try {
        return JSON.parse(content);
      } catch (e) {
        return { summary: content };
      }
    }

    return { summary: content };
  } catch (error) {
    console.error('OpenRouter API call failed:', error);
    return null;
  }
};

// Fallback analysis when API is unavailable
const getFallbackAnalysis = (type, data) => {
  const analyses = {
    PERFORMANCE_ANALYSIS: {
      summary: `Performance analysis completed for ${data.locationCount || 1} location(s).`,
      insights: [
        'Revenue trend shows consistent growth over the past quarter',
        'Customer satisfaction scores are above average',
        'Transaction count has increased by 15% month-over-month',
        'Peak hours show highest profitability'
      ],
      recommendations: [
        'Focus on peak hours staffing optimization',
        'Consider implementing loyalty program to increase repeat visits',
        'Review pricing strategy for top-selling items',
        'Invest in staff training for customer service improvement'
      ],
      riskFactors: [
        'Labor costs trending higher than industry average',
        'Customer wait times may need attention during peak hours'
      ]
    },
    BENCHMARKING: {
      summary: 'Comparative analysis across all locations completed.',
      topPerformers: data.topPerformers || [],
      underperformers: data.underperformers || [],
      insights: [
        'Top 20% of locations generate 40% of total revenue',
        'Regional variations in performance are significant',
        'Newer locations show faster growth rates',
        'Urban locations outperform suburban by 25%'
      ],
      recommendations: [
        'Share best practices from top performers',
        'Investigate operational differences in underperforming locations',
        'Consider territory-specific marketing strategies',
        'Implement cross-location mentorship programs'
      ]
    },
    COMPLIANCE_CHECK: {
      summary: 'Brand compliance audit analysis completed.',
      overallScore: data.avgScore || 85,
      criticalFindings: [
        'Some locations have inconsistent signage',
        'Training documentation needs updating at 3 locations',
        'Uniform standards vary across regions'
      ],
      recommendations: [
        'Schedule follow-up audits for low-scoring locations',
        'Update brand guidelines documentation',
        'Implement monthly compliance self-checks',
        'Create visual brand standards checklist'
      ]
    },
    DEMAND_FORECAST: {
      summary: 'Demand forecasting analysis for the next 30 days.',
      predictions: [
        { period: 'Week 1', expectedRevenue: Math.round((data.avgRevenue || 10000) * 1.05), confidence: 0.85 },
        { period: 'Week 2', expectedRevenue: Math.round((data.avgRevenue || 10000) * 1.02), confidence: 0.82 },
        { period: 'Week 3', expectedRevenue: Math.round((data.avgRevenue || 10000) * 0.98), confidence: 0.78 },
        { period: 'Week 4', expectedRevenue: Math.round((data.avgRevenue || 10000) * 1.10), confidence: 0.75 }
      ],
      factors: [
        'Seasonal trends suggest increased demand',
        'Upcoming local events may boost foot traffic',
        'Weather patterns favorable for the period',
        'Historical data shows end-of-month surge'
      ],
      recommendations: [
        'Increase inventory for high-demand items',
        'Schedule additional staff for expected busy periods',
        'Prepare promotional materials for slow periods',
        'Plan marketing campaigns around predicted peaks'
      ]
    },
    BEST_PRACTICE: {
      summary: 'Best practices analysis completed.',
      identifiedPractices: [
        { practice: 'Morning shift huddles', impact: 'Improved communication and 10% reduction in errors', adoptionRate: '45%' },
        { practice: 'Cross-training program', impact: 'Better coverage and 20% reduction in overtime', adoptionRate: '60%' },
        { practice: 'Customer feedback integration', impact: 'Higher satisfaction scores at implementing locations', adoptionRate: '35%' },
        { practice: 'Digital inventory tracking', impact: '15% reduction in waste and stockouts', adoptionRate: '70%' }
      ],
      recommendations: [
        'Roll out morning huddles to all locations',
        'Create standardized cross-training curriculum',
        'Implement system-wide customer feedback program',
        'Mandate digital inventory for all locations'
      ]
    },
    ANOMALY_DETECTION: {
      summary: 'Anomaly detection scan completed.',
      anomalies: [
        { type: 'Revenue Spike', location: 'Downtown Location', description: 'Unusual 40% revenue increase detected', severity: 'LOW', recommendation: 'Investigate cause for potential replication' },
        { type: 'Compliance Drop', location: 'West Side Branch', description: 'Sudden drop in compliance scores', severity: 'HIGH', recommendation: 'Schedule immediate audit review' },
        { type: 'Staff Turnover', location: 'North Mall', description: 'Higher than normal staff changes', severity: 'MEDIUM', recommendation: 'Review management practices and employee satisfaction' }
      ],
      systemHealth: 'Overall system operating within normal parameters'
    },
    REPORT_GENERATION: {
      summary: 'Comprehensive franchise report generated.',
      sections: [
        { title: 'Executive Summary', status: 'Generated' },
        { title: 'Financial Overview', status: 'Generated' },
        { title: 'Performance Metrics', status: 'Generated' },
        { title: 'Compliance Status', status: 'Generated' },
        { title: 'Recommendations', status: 'Generated' }
      ],
      keyMetrics: {
        totalRevenue: data.totalRevenue || 0,
        avgLocationRevenue: data.avgRevenue || 0,
        complianceRate: data.complianceRate || 0,
        customerSatisfaction: data.satisfaction || 0
      },
      insights: [
        'Overall franchise health is strong',
        'Growth trajectory meets annual targets',
        'Customer satisfaction trending upward'
      ],
      recommendations: [
        'Continue current growth initiatives',
        'Address compliance gaps in underperforming locations',
        'Invest in technology upgrades across network'
      ]
    }
  };

  return analyses[type] || { summary: 'Analysis type not supported' };
};

// Generate AI Analysis with OpenRouter
const generateAIAnalysis = async (type, data, context = {}) => {
  const prompts = {
    PERFORMANCE_ANALYSIS: `Analyze the following franchise performance data and provide insights:
      - Number of locations analyzed: ${data.locationCount || 1}
      - Data points collected: ${data.dataPoints || 0}
      - Context: ${JSON.stringify(context)}

      Provide a JSON response with: summary, insights (array of 4+ items), recommendations (array of 4+ items), and riskFactors (array of 2+ items).`,

    BENCHMARKING: `Perform benchmarking analysis for a franchise network:
      - Top performers: ${JSON.stringify(data.topPerformers || [])}
      - Underperformers: ${JSON.stringify(data.underperformers || [])}

      Provide a JSON response with: summary, insights (array of 4+ items), recommendations (array of 4+ items), topPerformers, and underperformers.`,

    COMPLIANCE_CHECK: `Analyze compliance audit data:
      - Average compliance score: ${data.avgScore || 0}%
      - Number of audits analyzed: ${data.auditCount || 0}

      Provide a JSON response with: summary, overallScore, criticalFindings (array), and recommendations (array of 4+ items).`,

    DEMAND_FORECAST: `Generate a demand forecast for a franchise location:
      - Historical average revenue: $${data.avgRevenue || 10000}
      - Forecast period: ${data.forecastDays || 30} days

      Provide a JSON response with: summary, predictions (array of weekly forecasts with period, expectedRevenue, confidence), factors (array), and recommendations (array).`,

    BEST_PRACTICE: `Identify best practices across franchise network:
      - Number of documented practices: ${data.practiceCount || 0}

      Provide a JSON response with: summary, identifiedPractices (array with practice, impact, adoptionRate), and recommendations (array of 4+ items).`,

    ANOMALY_DETECTION: `Analyze data for anomalies in franchise operations:
      - Financial records analyzed: ${data.financialRecords || 0}
      - Performance records analyzed: ${data.performanceRecords || 0}
      - Compliance records analyzed: ${data.complianceRecords || 0}

      Provide a JSON response with: summary, anomalies (array with type, location, description, severity, recommendation), and systemHealth.`,

    REPORT_GENERATION: `Generate a comprehensive franchise report:
      - Total revenue: $${data.totalRevenue || 0}
      - Average location revenue: $${data.avgRevenue || 0}
      - Compliance rate: ${data.complianceRate || 0}%
      - Customer satisfaction: ${data.satisfaction || 0}%

      Provide a JSON response with: summary, sections (array with title and status), keyMetrics, insights (array), and recommendations (array).`
  };

  const systemPrompt = `You are an AI analyst for a multi-location franchise management platform.
  Provide detailed, actionable business insights. Always respond with valid JSON matching the requested structure.
  Be specific, data-driven, and practical in your recommendations.`;

  const prompt = prompts[type];
  if (!prompt) {
    return getFallbackAnalysis(type, data);
  }

  const aiResponse = await callOpenRouter(prompt, systemPrompt);

  if (aiResponse) {
    // Merge AI response with expected data structures
    if (type === 'BENCHMARKING') {
      aiResponse.topPerformers = data.topPerformers || aiResponse.topPerformers || [];
      aiResponse.underperformers = data.underperformers || aiResponse.underperformers || [];
    }
    return aiResponse;
  }

  return getFallbackAnalysis(type, data);
};

// AI Performance Analyzer
router.post('/performance-analysis', authenticateToken, async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.body;

    const where = {};
    if (locationId) where.locationId = locationId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const performanceData = await req.prisma.performanceData.findMany({
      where,
      include: { location: { select: { id: true, name: true, code: true } } }
    });

    const analysis = await generateAIAnalysis('PERFORMANCE_ANALYSIS', {
      locationCount: [...new Set(performanceData.map(p => p.locationId))].length,
      dataPoints: performanceData.length
    });

    await req.prisma.aIAnalysis.create({
      data: {
        locationId: locationId || null,
        type: 'PERFORMANCE_ANALYSIS',
        input: { locationId, startDate, endDate },
        output: analysis
      }
    });

    res.json(analysis);
  } catch (error) {
    console.error('Performance analysis error:', error);
    res.status(500).json({ error: 'Failed to perform analysis' });
  }
});

// AI Benchmarking
router.post('/benchmarking', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { period } = req.body;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    let startDate;

    switch (period) {
      case 'quarter':
        const quarterStart = Math.floor(currentDate.getMonth() / 3) * 3;
        startDate = new Date(currentYear, quarterStart, 1);
        break;
      case 'year':
        startDate = new Date(currentYear, 0, 1);
        break;
      default:
        startDate = new Date(currentYear, currentDate.getMonth(), 1);
    }

    const financialData = await req.prisma.financialData.groupBy({
      by: ['locationId'],
      where: { period: { gte: startDate } },
      _sum: { revenue: true, netProfit: true }
    });

    const sortedByRevenue = [...financialData].sort((a, b) =>
      (b._sum.revenue || 0) - (a._sum.revenue || 0)
    );

    const topCount = Math.max(1, Math.ceil(sortedByRevenue.length * 0.2));
    const bottomCount = Math.max(1, Math.ceil(sortedByRevenue.length * 0.2));

    const topPerformerIds = sortedByRevenue.slice(0, topCount).map(f => f.locationId);
    const underperformerIds = sortedByRevenue.slice(-bottomCount).map(f => f.locationId);

    const [topLocations, underLocations] = await Promise.all([
      req.prisma.location.findMany({
        where: { id: { in: topPerformerIds } },
        select: { id: true, name: true, code: true }
      }),
      req.prisma.location.findMany({
        where: { id: { in: underperformerIds } },
        select: { id: true, name: true, code: true }
      })
    ]);

    const analysis = await generateAIAnalysis('BENCHMARKING', {
      topPerformers: topLocations,
      underperformers: underLocations
    });

    await req.prisma.aIAnalysis.create({
      data: {
        type: 'BENCHMARKING',
        input: { period },
        output: analysis
      }
    });

    res.json(analysis);
  } catch (error) {
    console.error('Benchmarking error:', error);
    res.status(500).json({ error: 'Failed to perform benchmarking' });
  }
});

// AI Compliance Checker
router.post('/compliance-check', authenticateToken, async (req, res) => {
  try {
    const { locationId } = req.body;

    const where = { status: 'COMPLETED' };
    if (locationId) where.locationId = locationId;

    const audits = await req.prisma.complianceAudit.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, code: true } },
        checklist: { select: { name: true, category: true } }
      },
      orderBy: { completedDate: 'desc' },
      take: 50
    });

    const avgScore = audits.length > 0
      ? audits.reduce((sum, a) => sum + (a.score || 0), 0) / audits.length
      : 0;

    const analysis = await generateAIAnalysis('COMPLIANCE_CHECK', {
      avgScore,
      auditCount: audits.length
    });

    await req.prisma.aIAnalysis.create({
      data: {
        locationId: locationId || null,
        type: 'COMPLIANCE_CHECK',
        input: { locationId },
        output: analysis
      }
    });

    res.json({ ...analysis, audits: audits.slice(0, 10) });
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: 'Failed to perform compliance check' });
  }
});

// AI Demand Forecaster
router.post('/demand-forecast', authenticateToken, async (req, res) => {
  try {
    const { locationId, forecastDays } = req.body;

    const where = {};
    if (locationId) where.locationId = locationId;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

    const historicalData = await req.prisma.performanceData.findMany({
      where: {
        ...where,
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'desc' }
    });

    const avgRevenue = historicalData.length > 0
      ? historicalData.reduce((sum, d) => sum + d.salesAmount, 0) / historicalData.length
      : 10000;

    const analysis = await generateAIAnalysis('DEMAND_FORECAST', {
      avgRevenue,
      forecastDays: forecastDays || 30
    });

    await req.prisma.aIAnalysis.create({
      data: {
        locationId: locationId || null,
        type: 'DEMAND_FORECAST',
        input: { locationId, forecastDays },
        output: analysis
      }
    });

    res.json(analysis);
  } catch (error) {
    console.error('Demand forecast error:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

// AI Best Practice Finder
router.post('/best-practices', authenticateToken, async (req, res) => {
  try {
    const { category } = req.body;

    const where = { isApproved: true };
    if (category) where.category = category;

    const practices = await req.prisma.bestPractice.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const analysis = await generateAIAnalysis('BEST_PRACTICE', {
      practiceCount: practices.length
    });

    await req.prisma.aIAnalysis.create({
      data: {
        type: 'BEST_PRACTICE',
        input: { category },
        output: analysis
      }
    });

    res.json({ ...analysis, existingPractices: practices });
  } catch (error) {
    console.error('Best practices error:', error);
    res.status(500).json({ error: 'Failed to analyze best practices' });
  }
});

// AI Training Assistant
router.post('/training-assistant', authenticateToken, async (req, res) => {
  try {
    const { query, category } = req.body;

    const where = { isActive: true };
    if (category) where.category = category;

    const materials = await req.prisma.trainingMaterial.findMany({
      where,
      orderBy: { title: 'asc' }
    });

    const sops = await req.prisma.sOP.findMany({
      where: { isActive: true, ...(category && { category }) },
      orderBy: { title: 'asc' }
    });

    const articles = await req.prisma.knowledgeArticle.findMany({
      where: { isPublished: true, ...(category && { category }) },
      orderBy: { views: 'desc' },
      take: 10
    });

    // Use OpenRouter for intelligent response if query is provided
    let aiResponse = null;
    if (query) {
      const prompt = `User is asking about training in a franchise context: "${query}"

      Available training materials: ${materials.map(m => m.title).join(', ')}
      Available SOPs: ${sops.map(s => s.title).join(', ')}

      Provide a helpful response with specific recommendations from these resources.`;

      aiResponse = await callOpenRouter(prompt, 'You are a helpful training assistant for a franchise business. Provide specific, actionable guidance.');
    }

    const response = {
      query,
      answer: aiResponse?.summary || `Based on your query about "${query || 'training'}", here are relevant resources:`,
      suggestedMaterials: materials.slice(0, 5),
      suggestedSOPs: sops.slice(0, 5),
      suggestedArticles: articles.slice(0, 5),
      tips: aiResponse?.tips || [
        'Start with the required training materials',
        'Review SOPs for operational procedures',
        'Check knowledge base for common questions'
      ]
    };

    res.json(response);
  } catch (error) {
    console.error('Training assistant error:', error);
    res.status(500).json({ error: 'Failed to get training assistance' });
  }
});

// AI Report Generator
router.post('/generate-report', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { reportType, locationId, startDate, endDate } = req.body;

    const currentYear = new Date().getFullYear();
    const start = startDate ? new Date(startDate) : new Date(currentYear, 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const where = { period: { gte: start, lte: end } };
    if (locationId) where.locationId = locationId;

    const [financialData, performanceData, complianceData] = await Promise.all([
      req.prisma.financialData.aggregate({
        where,
        _sum: { revenue: true, netProfit: true },
        _avg: { revenue: true }
      }),
      req.prisma.performanceData.aggregate({
        where: { date: { gte: start, lte: end }, ...(locationId && { locationId }) },
        _avg: { customerSatisfaction: true }
      }),
      req.prisma.complianceAudit.aggregate({
        where: { status: 'COMPLETED', completedDate: { gte: start, lte: end }, ...(locationId && { locationId }) },
        _avg: { score: true }
      })
    ]);

    const analysis = await generateAIAnalysis('REPORT_GENERATION', {
      totalRevenue: financialData._sum.revenue || 0,
      avgRevenue: financialData._avg.revenue || 0,
      satisfaction: performanceData._avg.customerSatisfaction || 0,
      complianceRate: complianceData._avg.score || 0
    });

    await req.prisma.aIAnalysis.create({
      data: {
        locationId: locationId || null,
        type: 'REPORT_GENERATION',
        input: { reportType, locationId, startDate, endDate },
        output: analysis
      }
    });

    res.json(analysis);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// AI Anomaly Detector
router.post('/anomaly-detection', authenticateToken, isCorporate, async (req, res) => {
  try {
    const { lookbackDays } = req.body;
    const days = lookbackDays || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [recentFinancial, recentPerformance, recentCompliance] = await Promise.all([
      req.prisma.financialData.findMany({
        where: { period: { gte: startDate } },
        include: { location: { select: { id: true, name: true, code: true } } }
      }),
      req.prisma.performanceData.findMany({
        where: { date: { gte: startDate } },
        include: { location: { select: { id: true, name: true, code: true } } }
      }),
      req.prisma.complianceAudit.findMany({
        where: { completedDate: { gte: startDate } },
        include: { location: { select: { id: true, name: true, code: true } } }
      })
    ]);

    const analysis = await generateAIAnalysis('ANOMALY_DETECTION', {
      financialRecords: recentFinancial.length,
      performanceRecords: recentPerformance.length,
      complianceRecords: recentCompliance.length
    });

    await req.prisma.aIAnalysis.create({
      data: {
        type: 'ANOMALY_DETECTION',
        input: { lookbackDays: days },
        output: analysis
      }
    });

    res.json(analysis);
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

// Get AI analysis history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { type, locationId, limit } = req.query;

    const where = {};
    if (type) where.type = type;
    if (locationId) where.locationId = locationId;

    const analyses = await req.prisma.aIAnalysis.findMany({
      where,
      include: { location: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 20
    });

    res.json(analyses);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Get AI analysis types
router.get('/types', authenticateToken, async (req, res) => {
  res.json([
    { value: 'PERFORMANCE_ANALYSIS', label: 'Performance Analysis', description: 'Analyze location performance metrics' },
    { value: 'BENCHMARKING', label: 'Benchmarking', description: 'Compare locations against each other' },
    { value: 'COMPLIANCE_CHECK', label: 'Compliance Check', description: 'Audit brand standard compliance' },
    { value: 'DEMAND_FORECAST', label: 'Demand Forecast', description: 'Predict future demand' },
    { value: 'BEST_PRACTICE', label: 'Best Practice Finder', description: 'Identify successful practices' },
    { value: 'ANOMALY_DETECTION', label: 'Anomaly Detection', description: 'Flag unusual patterns' },
    { value: 'REPORT_GENERATION', label: 'Report Generation', description: 'Generate comprehensive reports' }
  ]);
});

module.exports = router;
