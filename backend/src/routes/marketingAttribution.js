// Marketing-spend attribution across locations and channels.
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// In-memory ledger of spend and conversions.
const spend = [];          // {locationId, channel, dateISO, amountUSD}
const conversions = [];    // {locationId, channel, dateISO, valueUSD, customerId}

router.post('/spend', authenticateToken, (req, res) => {
  const { locationId, channel, dateISO, amountUSD } = req.body;
  if (!locationId || !channel || amountUSD == null) return res.status(400).json({ error: 'locationId, channel, amountUSD required' });
  spend.push({ locationId, channel, dateISO: dateISO || new Date().toISOString(), amountUSD: Number(amountUSD) });
  res.json({ ok: true, total: spend.length });
});

router.post('/conversion', authenticateToken, (req, res) => {
  const { locationId, channel, valueUSD, customerId } = req.body;
  if (!locationId || !channel) return res.status(400).json({ error: 'locationId and channel required' });
  conversions.push({ locationId, channel, dateISO: new Date().toISOString(), valueUSD: Number(valueUSD || 0), customerId });
  res.json({ ok: true, total: conversions.length });
});

router.get('/report/:locationId', authenticateToken, (req, res) => {
  const locSpend = spend.filter(s => s.locationId === req.params.locationId);
  const locConv = conversions.filter(c => c.locationId === req.params.locationId);
  const byChannel = {};
  for (const s of locSpend) {
    byChannel[s.channel] = byChannel[s.channel] || { spend: 0, conversions: 0, revenue: 0 };
    byChannel[s.channel].spend += s.amountUSD;
  }
  for (const c of locConv) {
    byChannel[c.channel] = byChannel[c.channel] || { spend: 0, conversions: 0, revenue: 0 };
    byChannel[c.channel].conversions++;
    byChannel[c.channel].revenue += c.valueUSD;
  }
  for (const k of Object.keys(byChannel)) {
    const x = byChannel[k];
    x.roas = x.spend ? Number((x.revenue / x.spend).toFixed(2)) : null;
    x.cpa = x.conversions ? Number((x.spend / x.conversions).toFixed(2)) : null;
  }
  res.json({ locationId: req.params.locationId, channels: byChannel });
});

module.exports = router;
