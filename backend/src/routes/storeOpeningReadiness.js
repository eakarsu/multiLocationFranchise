const express = require('express');

const router = express.Router();

router.post('/score', (req, res) => {
  const {
    location = 'New location',
    permits = 80,
    staffing = 65,
    training = 70,
    inventory = 75,
    localMarketing = 55,
  } = req.body || {};
  const dimensions = { permits, staffing, training, inventory, localMarketing };
  const score = Math.round(Object.values(dimensions).reduce((sum, value) => sum + Number(value || 0), 0) / 5);
  const blockers = Object.entries(dimensions)
    .filter(([, value]) => Number(value) < 70)
    .map(([key]) => key);

  res.json({
    location,
    score,
    status: score >= 85 ? 'ready' : score >= 70 ? 'watch' : 'blocked',
    blockers,
    launchPlan: [
      blockers.includes('staffing') ? 'Accelerate hiring and manager shadow shifts.' : 'Confirm opening-week labor schedule.',
      blockers.includes('localMarketing') ? 'Launch local awareness offers this week.' : 'Hold marketing budget for opening weekend.',
      blockers.includes('training') ? 'Require SOP certification before soft launch.' : 'Run final brand-standard checklist.',
    ],
  });
});

module.exports = router;
