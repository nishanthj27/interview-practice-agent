// ============================================================
// routes/interview.js
// All interview-related API endpoints
// ============================================================
'use strict';

const express       = require('express');
const router        = express.Router();
const geminiService = require('../services/geminiService');
const { buildSystemPrompt } = require('../services/promptService');
const { validateChatBody, validateScoreBody } = require('../middleware/validate');
const JOBS          = require('../data/jobs');

// ── GET /api/jobs ─────────────────────────────────────────────
// Returns available job roles (no sensitive data)
router.get('/jobs', (req, res) => {
    const safe = JOBS.map(({ id, title, icon, description, domains }) =>
        ({ id, title, icon, description, domains })
    );
    res.json({ jobs: safe });
});

// ── POST /api/chat ────────────────────────────────────────────
// Get next interviewer message (question or follow-up)
// Body: { jobId, settings, userInfo, history, resumeText? }
router.post('/chat', validateChatBody, async (req, res, next) => {
    try {
        const { jobId, settings, userInfo, history, resumeText } = req.body;

        const systemPrompt = buildSystemPrompt(jobId, settings, userInfo, resumeText || '');

        // history is [{role:'user'|'assistant', content:string}, ...]
        const message = await geminiService.getNextMessage(systemPrompt, history);

        res.json({ message });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/score ───────────────────────────────────────────
// Score a single answer
// Body: { question, answer, jobTitle, difficulty }
router.post('/score', validateScoreBody, async (req, res, next) => {
    try {
        const { question, answer, jobTitle, difficulty } = req.body;
        const score = await geminiService.scoreAnswer(question, answer, jobTitle, difficulty);
        res.json({ score });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/feedback ────────────────────────────────────────
// Generate final interview feedback
// Body: { sessionData }
router.post('/feedback', async (req, res, next) => {
    try {
        const { sessionData } = req.body;
        if (!sessionData) return res.status(400).json({ error: 'sessionData is required' });

        const feedback = await geminiService.generateFinalFeedback(sessionData);
        res.json({ feedback });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/resume ──────────────────────────────────────────
// Parse uploaded resume text → concise summary
// Body: { resumeText }
router.post('/resume', async (req, res, next) => {
    try {
        const { resumeText } = req.body;
        if (!resumeText || resumeText.trim().length < 50) {
            return res.status(400).json({ error: 'resumeText must be at least 50 characters' });
        }
        if (resumeText.length > 50000) {
            return res.status(413).json({ error: 'resumeText is too large (max 50,000 characters)' });
        }
        const summary = await geminiService.parseResume(resumeText);
        res.json({ summary });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
