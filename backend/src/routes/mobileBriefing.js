// Mobile app for franchisees with daily AI briefings + alerts.
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

router.post('/daily-briefing', authenticateToken, async (req, res) => {
  try {
    const { locationId, yesterdayKpis = {}, todayShifts = [], announcements = [] } = req.body;
    if (!OPENROUTER_API_KEY) return res.status(503).json({ error: 'OPENROUTER_API_KEY not configured' });
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'Produce a short (<200 word) daily briefing for a franchisee. Include 3 KPI callouts and 3 focus items.' },
          { role: 'user', content: `Yesterday KPIs: ${JSON.stringify(yesterdayKpis)}\nToday's shifts: ${JSON.stringify(todayShifts).slice(0, 1500)}\nAnnouncements: ${JSON.stringify(announcements).slice(0, 600)}` }
        ],
        max_tokens: 600
      })
    });
    const d = await r.json();
    if (d.error) return res.status(502).json({ error: d.error.message });
    res.json({ locationId, briefing: d.choices?.[0]?.message?.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const deviceTokens = new Map();
router.post('/register-device', authenticateToken, (req, res) => {
  const { userId, deviceToken, platform } = req.body;
  if (!userId || !deviceToken) return res.status(400).json({ error: 'userId and deviceToken required' });
  deviceTokens.set(deviceToken, { userId, platform, registeredAt: new Date() });
  res.json({ ok: true, total: deviceTokens.size });
});

router.post('/alert', authenticateToken, (req, res) => {
  const { locationId, message, severity = 'info' } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  // TODO: configure credentials — push to FCM / APNS here.
  res.json({ queued: true, locationId, severity, recipients: deviceTokens.size });
});

module.exports = router;
