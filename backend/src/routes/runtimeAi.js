const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/franchise-portfolio-review', authenticateToken, async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || req.body?.context || '').trim();
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const baseUrl = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/+$/, '');
    const model = String(process.env.OPENROUTER_MODEL || '').trim();
    const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
    if (baseUrl !== 'https://openrouter.ai/api/v1' || !model || !apiKey) {
      return res.status(503).json({ error: 'Exact OpenRouter configuration is required' });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 110_000);
    let providerResponse;
    try {
      providerResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Multi-Location Franchise',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Review multi-location franchise operations conservatively, emphasizing evidence, location-level variance, financial controls, and accountable human decisions.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 650,
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!providerResponse.ok) throw new Error(`OpenRouter API error (${providerResponse.status})`);
    const provider = await providerResponse.json();
    const content = String(provider.choices?.[0]?.message?.content || '').trim();
    const providerReceipt = {
      requestId: String(provider.id || ''),
      provider: String(provider.provider || 'openrouter'),
      upstreamModel: String(provider.model || model),
      created: Number(provider.created || 0),
    };
    if (!content || !providerReceipt.requestId) throw new Error('OpenRouter response or provider receipt is missing');

    const saved = await req.prisma.aIAnalysis.create({
      data: {
        type: 'REPORT_GENERATION',
        input: { prompt, requestedBy: req.user.id },
        output: { content, model, providerReceipt },
      },
      select: { id: true },
    });
    return res.json({ content, model, providerReceipt, interactionId: saved.id });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
