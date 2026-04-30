// ============================================================
// middleware/validate.js
// Input validation for API routes
// ============================================================
'use strict';

function validateChatBody(req, res, next) {
    const { jobId, settings, userInfo, history } = req.body;

    if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json({ error: 'jobId (string) is required' });
    }
    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'settings object is required' });
    }
    if (!Array.isArray(history)) {
        return res.status(400).json({ error: 'history must be an array' });
    }
    // Sanitise history — only allow valid roles and string content
    const clean = history
        .filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
        .slice(-40); // hard cap: last 40 messages
    req.body.history = clean;

    next();
}

function validateScoreBody(req, res, next) {
    const { question, answer, jobTitle, difficulty } = req.body;

    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'question (string) is required' });
    }
    if (!answer || typeof answer !== 'string') {
        return res.status(400).json({ error: 'answer (string) is required' });
    }
    if (answer.trim().length < 3) {
        return res.status(400).json({ error: 'answer is too short' });
    }
    if (!jobTitle) {
        return res.status(400).json({ error: 'jobTitle is required' });
    }

    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    req.body.difficulty = validDifficulties.includes(difficulty) ? difficulty : 'intermediate';

    next();
}

module.exports = { validateChatBody, validateScoreBody };
