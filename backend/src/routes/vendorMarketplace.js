// Vendor marketplace with bulk-discount negotiation.
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const vendors = new Map();
const offers = [];

router.post('/vendors', authenticateToken, (req, res) => {
  const { id, name, categories = [], baseDiscount = 0 } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });
  vendors.set(id, { id, name, categories, baseDiscount, createdAt: new Date() });
  res.json(vendors.get(id));
});

router.get('/vendors', authenticateToken, (req, res) => {
  const q = (req.query.category || '').toLowerCase();
  const list = [...vendors.values()].filter(v => !q || v.categories.map(c => c.toLowerCase()).includes(q));
  res.json({ count: list.length, vendors: list });
});

router.post('/bulk-offer', authenticateToken, (req, res) => {
  const { vendorId, totalUnits, targetPrice } = req.body;
  const v = vendors.get(vendorId);
  if (!v) return res.status(404).json({ error: 'vendor not found' });
  // discount = base + scale by units (1% per 100 units, capped at 25%).
  const scale = Math.min(0.25, totalUnits / 10000);
  const discountPct = (v.baseDiscount || 0) + scale * 100;
  const computedPrice = targetPrice ? Number(targetPrice) * (1 - discountPct / 100) : null;
  const offer = { id: offers.length + 1, vendorId, totalUnits, computedPrice, discountPct: Number(discountPct.toFixed(2)), createdAt: new Date() };
  offers.push(offer);
  res.json(offer);
});

router.get('/offers', authenticateToken, (_req, res) => {
  res.json({ count: offers.length, offers: offers.slice(-100) });
});

module.exports = router;
