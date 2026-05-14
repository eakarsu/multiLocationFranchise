// Multi-currency royalty automation with FX hedging dashboards.
// TODO: configure credentials — EXCHANGERATE_API_KEY (optional, free tier available).
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const cache = { rates: null, fetchedAt: 0 };

async function fxRates(base = 'USD') {
  if (cache.rates && Date.now() - cache.fetchedAt < 3600_000) return cache.rates;
  const key = process.env.EXCHANGERATE_API_KEY;
  const url = key
    ? `https://v6.exchangerate-api.com/v6/${key}/latest/${base}`
    : `https://api.exchangerate-api.com/v4/latest/${base}`;
  try {
    const r = await fetch(url, { timeout: 10000 });
    const d = await r.json();
    cache.rates = d.conversion_rates || d.rates;
    cache.fetchedAt = Date.now();
    return cache.rates;
  } catch {
    return null;
  }
}

router.get('/rates', authenticateToken, async (_req, res) => {
  const r = await fxRates();
  if (!r) return res.status(502).json({ error: 'unable to fetch rates' });
  res.json({ base: 'USD', rates: r });
});

router.post('/calculate', authenticateToken, async (req, res) => {
  const { locations, royaltyPct = 6 } = req.body;
  if (!Array.isArray(locations)) return res.status(400).json({ error: 'locations[] required' });
  const rates = await fxRates();
  const out = [];
  for (const loc of locations) {
    const localRev = Number(loc.revenue || 0);
    const cur = loc.currency || 'USD';
    const rate = rates ? rates[cur] : 1;
    const usdRev = rate ? localRev / rate : localRev;
    const royaltyUSD = usdRev * (royaltyPct / 100);
    out.push({ locationId: loc.id, currency: cur, localRevenue: localRev, usdRevenue: Math.round(usdRev), royaltyUSD: Math.round(royaltyUSD) });
  }
  res.json({ rows: out, totalRoyaltyUSD: out.reduce((s, r) => s + r.royaltyUSD, 0) });
});

// POST /api/multi-currency-royalty/hedge-recommendation — simple variance-based suggestion.
router.post('/hedge-recommendation', authenticateToken, (req, res) => {
  const { exposures } = req.body; // [{currency, usdAmount}]
  if (!Array.isArray(exposures)) return res.status(400).json({ error: 'exposures[] required' });
  const recs = exposures.map(e => ({
    currency: e.currency,
    usdAmount: e.usdAmount,
    recommendation: e.usdAmount > 100000 ? 'forward-contract 50%' : 'monitor only'
  }));
  res.json({ recommendations: recs });
});

module.exports = router;
