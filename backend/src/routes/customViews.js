// Custom Views for Multi-Location Franchise Mgmt
// 4 endpoints: location-performance (VIZ chart), region-heatmap (VIZ),
//              franchise-report (NON-VIZ PDF), compliance-rules (NON-VIZ CRUD)
const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper: use ipKeyGenerator if available (express-rate-limit v7+)
let ipKeyGen;
try { ipKeyGen = require('express-rate-limit').ipKeyGenerator; } catch (_e) { ipKeyGen = null; }

const cvLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGen ? (req, res) => ipKeyGen(req, res) : undefined,
  message: { error: 'Too many requests on custom-views' }
});

router.use(cvLimiter);

// In-memory store for brand compliance rules (CRUD)
let RULE_ID = 5;
const complianceRules = [
  { id: 1, code: 'SIGN-001', category: 'Signage', title: 'Logo placement on storefront', severity: 'HIGH', description: 'Primary logo must be centered above main entrance with min 24in clearance.', active: true, createdAt: new Date().toISOString() },
  { id: 2, code: 'UNIF-002', category: 'Uniform', title: 'Staff uniform color compliance', severity: 'MEDIUM', description: 'All front-line staff must wear approved brand-color polo and name tag.', active: true, createdAt: new Date().toISOString() },
  { id: 3, code: 'CLEAN-003', category: 'Cleanliness', title: 'Restroom hourly inspection', severity: 'HIGH', description: 'Restrooms must be inspected and logged every 60 minutes during open hours.', active: true, createdAt: new Date().toISOString() },
  { id: 4, code: 'MENU-004', category: 'Menu', title: 'Approved menu boards only', severity: 'CRITICAL', description: 'Only corporate-supplied digital menu boards permitted; no third-party signage.', active: true, createdAt: new Date().toISOString() }
];

// Deterministic sample data generator
function seedLocations() {
  const regions = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'Pacific'];
  const cities = ['Boston', 'Atlanta', 'Chicago', 'Dallas', 'Denver', 'Seattle', 'Miami', 'Houston', 'Phoenix', 'Portland', 'NYC', 'LA'];
  return cities.map((city, i) => ({
    id: `loc-${i + 1}`,
    name: `${city} Flagship`,
    code: `FR-${1000 + i}`,
    region: regions[i % regions.length],
    revenue: 180000 + ((i * 37) % 9) * 25000 + (i * 1500),
    transactions: 2400 + ((i * 53) % 11) * 110,
    avgTicket: 14.5 + ((i * 7) % 5),
    complianceScore: 72 + ((i * 11) % 25),
    satisfactionScore: 3.6 + ((i * 13) % 14) / 10
  }));
}

// ---------- VIZ 1: Location performance chart data ----------
router.get('/location-performance', authenticateToken, (req, res) => {
  try {
    const locs = seedLocations();
    const metric = (req.query.metric || 'revenue').toString();
    const top = parseInt(req.query.top || '12', 10);
    const sorted = [...locs].sort((a, b) => (b[metric] || 0) - (a[metric] || 0)).slice(0, top);
    res.json({
      metric,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue: locs.reduce((s, l) => s + l.revenue, 0),
        totalTransactions: locs.reduce((s, l) => s + l.transactions, 0),
        avgCompliance: +(locs.reduce((s, l) => s + l.complianceScore, 0) / locs.length).toFixed(1),
        locationCount: locs.length
      },
      series: sorted.map(l => ({
        location: l.name,
        code: l.code,
        region: l.region,
        revenue: l.revenue,
        transactions: l.transactions,
        avgTicket: +l.avgTicket.toFixed(2),
        complianceScore: l.complianceScore
      }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- VIZ 2: Regional heatmap ----------
router.get('/region-heatmap', authenticateToken, (req, res) => {
  try {
    const locs = seedLocations();
    const regions = {};
    for (const l of locs) {
      if (!regions[l.region]) regions[l.region] = { region: l.region, locations: 0, revenue: 0, compliance: 0, satisfaction: 0 };
      regions[l.region].locations += 1;
      regions[l.region].revenue += l.revenue;
      regions[l.region].compliance += l.complianceScore;
      regions[l.region].satisfaction += l.satisfactionScore;
    }
    const rows = Object.values(regions).map(r => ({
      region: r.region,
      locations: r.locations,
      revenue: r.revenue,
      avgRevenue: Math.round(r.revenue / r.locations),
      avgCompliance: +(r.compliance / r.locations).toFixed(1),
      avgSatisfaction: +(r.satisfaction / r.locations).toFixed(2),
      // Heat intensity 0-100 derived from blended metric
      heat: Math.min(100, Math.round(
        ((r.revenue / r.locations) / 4000) +
        (r.compliance / r.locations) * 0.4 +
        (r.satisfaction / r.locations) * 6
      ))
    })).sort((a, b) => b.heat - a.heat);
    res.json({ generatedAt: new Date().toISOString(), regions: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- NON-VIZ 1: Franchise report (PDF-style text + structured data) ----------
router.post('/franchise-report', authenticateToken, (req, res) => {
  try {
    const { title = 'Franchise Performance Report', period = 'Q1 2026', regions = [], includeCompliance = true } = req.body || {};
    const locs = seedLocations();
    const filtered = regions.length ? locs.filter(l => regions.includes(l.region)) : locs;
    const totalRevenue = filtered.reduce((s, l) => s + l.revenue, 0);
    const avgCompliance = +(filtered.reduce((s, l) => s + l.complianceScore, 0) / Math.max(1, filtered.length)).toFixed(1);
    const topPerformers = [...filtered].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const lines = [];
    lines.push(`=== ${title} ===`);
    lines.push(`Period: ${period}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push(`Locations Included: ${filtered.length}`);
    lines.push(`Total Revenue: $${totalRevenue.toLocaleString()}`);
    lines.push(`Avg Compliance Score: ${avgCompliance}`);
    lines.push('');
    lines.push('Top 5 Locations:');
    topPerformers.forEach((l, i) => lines.push(`  ${i + 1}. ${l.name} (${l.region}) — $${l.revenue.toLocaleString()}`));
    if (includeCompliance) {
      lines.push('');
      lines.push('Active Compliance Rules:');
      complianceRules.filter(r => r.active).forEach(r => lines.push(`  [${r.severity}] ${r.code}: ${r.title}`));
    }
    const pdfText = lines.join('\n');
    res.json({
      reportId: 'FR-' + Date.now(),
      title, period,
      generatedAt: new Date().toISOString(),
      summary: { locations: filtered.length, totalRevenue, avgCompliance },
      topPerformers: topPerformers.map(l => ({ name: l.name, region: l.region, revenue: l.revenue })),
      complianceRulesIncluded: includeCompliance ? complianceRules.filter(r => r.active).length : 0,
      pdfText,
      // Base64 of plain text (so the frontend can offer a downloadable blob)
      pdfBase64: Buffer.from(pdfText, 'utf-8').toString('base64')
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- NON-VIZ 2: Brand Compliance Rules (CRUD) ----------
router.get('/compliance-rules', authenticateToken, (req, res) => {
  res.json({ items: complianceRules, total: complianceRules.length });
});

router.post('/compliance-rules', authenticateToken, (req, res) => {
  try {
    const { code, category, title, severity = 'MEDIUM', description = '', active = true } = req.body || {};
    if (!code || !title) return res.status(400).json({ error: 'code and title required' });
    const rule = {
      id: ++RULE_ID,
      code: String(code),
      category: String(category || 'General'),
      title: String(title),
      severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity) ? severity : 'MEDIUM',
      description: String(description),
      active: !!active,
      createdAt: new Date().toISOString()
    };
    complianceRules.push(rule);
    res.status(201).json(rule);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/compliance-rules/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = complianceRules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const allowed = ['code', 'category', 'title', 'severity', 'description', 'active'];
  for (const k of allowed) if (k in (req.body || {})) complianceRules[idx][k] = req.body[k];
  complianceRules[idx].updatedAt = new Date().toISOString();
  res.json(complianceRules[idx]);
});

router.delete('/compliance-rules/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = complianceRules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const [removed] = complianceRules.splice(idx, 1);
  res.json({ ok: true, removed });
});

module.exports = router;
