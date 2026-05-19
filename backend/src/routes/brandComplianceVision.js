// Vision-based brand-compliance audit (mystery-shop photo upload → score).
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

router.post('/audit', authenticateToken, async (req, res) => {
  try {
    const { locationId, photoUrls = [], category = 'signage' } = req.body;
    if (!photoUrls.length) return res.status(400).json({ error: 'photoUrls[] required' });
    if (!OPENROUTER_API_KEY) return res.status(503).json({ error: 'OPENROUTER_API_KEY not configured' });

    const scores = [];
    for (const url of photoUrls.slice(0, 6)) {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `Audit ${category} for brand compliance. Return JSON {"compliance_score":0-100,"issues":[string],"recommendations":[string]}.` },
              { type: 'image_url', image_url: { url } }
            ]
          }],
          max_tokens: 400
        })
      });
      const d = await r.json();
      try { scores.push(JSON.parse(d.choices[0].message.content.match(/\{[\s\S]*\}/)[0])); }
      catch { scores.push({ raw: d.choices?.[0]?.message?.content }); }
    }
    const valid = scores.filter(s => typeof s.compliance_score === 'number');
    const avg = valid.length ? valid.reduce((s, x) => s + x.compliance_score, 0) / valid.length : null;
    res.json({ locationId, category, averageScore: avg, perPhoto: scores });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
