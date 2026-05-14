// Franchisee certification LMS with AI proctoring.
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// In-memory courses + attempts.
const courses = new Map();
const attempts = new Map();

router.post('/courses', authenticateToken, (req, res) => {
  const { id, title, modules = [], passingScore = 80 } = req.body;
  if (!id || !title) return res.status(400).json({ error: 'id and title required' });
  courses.set(id, { id, title, modules, passingScore, createdAt: new Date() });
  res.json(courses.get(id));
});

router.get('/courses', authenticateToken, (_req, res) => {
  res.json({ count: courses.size, courses: [...courses.values()] });
});

router.post('/attempts/start', authenticateToken, (req, res) => {
  const { courseId, userId } = req.body;
  const c = courses.get(courseId);
  if (!c) return res.status(404).json({ error: 'course not found' });
  const id = `att_${Date.now()}`;
  attempts.set(id, { id, courseId, userId, answers: [], startedAt: new Date(), proctorFlags: [] });
  res.json({ attemptId: id });
});

router.post('/attempts/:id/submit-answer', authenticateToken, (req, res) => {
  const a = attempts.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'attempt not found' });
  const { questionId, answer, suspiciousSignal } = req.body;
  a.answers.push({ questionId, answer, at: new Date() });
  if (suspiciousSignal) a.proctorFlags.push({ at: new Date(), signal: suspiciousSignal });
  res.json({ ok: true, answers: a.answers.length, flags: a.proctorFlags.length });
});

router.post('/attempts/:id/grade', authenticateToken, async (req, res) => {
  const a = attempts.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'attempt not found' });
  const c = courses.get(a.courseId);
  // naive grading: correctAnswers field on each module question.
  let correct = 0;
  let total = 0;
  for (const m of c.modules) {
    for (const q of m.questions || []) {
      total++;
      const given = a.answers.find(x => x.questionId === q.id);
      if (given && String(given.answer).trim().toLowerCase() === String(q.correct).trim().toLowerCase()) correct++;
    }
  }
  const score = total ? Math.round((correct / total) * 100) : 0;
  const passed = score >= c.passingScore;
  a.score = score;
  a.passed = passed;
  res.json({ attemptId: a.id, score, passed, proctorFlags: a.proctorFlags.length });
});

module.exports = router;
