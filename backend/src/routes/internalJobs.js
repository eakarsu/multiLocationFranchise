const express = require('express');
const { timingSafeEqual } = require('node:crypto');
const { processOutboxBatch } = require('../revenue/outbox');

const router = express.Router();

function authorized(value, expected) {
  if (!value || !expected) return false;
  const supplied = Buffer.from(value);
  const target = Buffer.from(`Bearer ${expected}`);
  return supplied.length === target.length && timingSafeEqual(supplied, target);
}

router.post('/outbox', async (req, res) => {
  if (!authorized(req.get('authorization'), process.env.INTERNAL_JOB_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const requested = Number(req.query.limit || 25);
  const results = await processOutboxBatch(
    req.prisma,
    Number.isInteger(requested) ? requested : 25,
  );
  res.json({ processed: results.length, results });
});

module.exports = router;
