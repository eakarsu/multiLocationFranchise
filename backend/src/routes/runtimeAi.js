const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const ownReports = (userId) => ({
  type: 'REPORT_GENERATION',
  input: { path: ['requestedBy'], equals: userId },
});

router.get('/franchise-portfolio-review/history', authenticateToken, async (req, res, next) => {
  try {
    const reports = await req.prisma.aIAnalysis.findMany({
      where: ownReports(req.user.id),
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, createdAt: true, output: true },
    });
    return res.json(reports);
  } catch (error) { return next(error); }
});

router.get('/franchise-portfolio-review/history/:id', authenticateToken, async (req, res, next) => {
  try {
    const report = await req.prisma.aIAnalysis.findFirst({
      where: { ...ownReports(req.user.id), id: req.params.id },
      select: { id: true, createdAt: true, output: true },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    return res.json(report);
  } catch (error) { return next(error); }
});

router.post('/franchise-portfolio-review', authenticateToken, async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || req.body?.context || '').trim();
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const baseUrl = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/+$/, '');
    const model = String(process.env.OPENROUTER_MODEL || '').trim();
    const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
    if (baseUrl !== 'https://openrouter.ai/api/v1' || !model || !apiKey) {
      return res.json({ available: false, message: 'AI generation is unavailable because OpenRouter is not configured. No report was generated or saved.' });
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
    } catch (_) {
      return res.json({ available: false, message: 'OpenRouter could not be reached. No report was generated or saved.' });
    } finally {
      clearTimeout(timer);
    }

    if (!providerResponse.ok) return res.json({ available: false, message: `OpenRouter did not complete the request (HTTP ${providerResponse.status}). No report was generated or saved.` });
    let provider;
    try { provider = await providerResponse.json(); }
    catch (_) { return res.json({ available: false, message: 'OpenRouter returned an unreadable response. No report was generated or saved.' }); }
    const content = String(provider.choices?.[0]?.message?.content || '').trim();
    const providerReceipt = {
      requestId: String(provider.id || ''),
      provider: String(provider.provider || 'openrouter'),
      upstreamModel: String(provider.model || model),
      created: Number(provider.created || 0),
    };
    if (!content || !providerReceipt.requestId) return res.json({ available: false, message: 'OpenRouter returned an incomplete response. No report was generated or saved.' });

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
