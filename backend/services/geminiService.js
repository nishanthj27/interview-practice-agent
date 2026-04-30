// ============================================================
// services/geminiService.js
// All Gemini API calls live here. The API key is read from
// process.env — it never touches the frontend.
// ============================================================
'use strict';

// node-fetch v3 is ESM; use dynamic import or switch to v2 for CJS.
// We use the built-in fetch available in Node 18+.

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const PRIMARY_MODEL  = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.0-flash';

// ── Low-level API call ────────────────────────────────────────
async function callGemini(model, messages, systemPrompt, options = {}) {
    const key = process.env.GEMINI_API_KEY;
    const url = `${BASE_URL}/${model}:generateContent?key=${key}`;

    // Map our neutral {role, content} format to Gemini's format.
    // Gemini requires at least one content item.
    const contents = (Array.isArray(messages) ? messages : [])
        .filter(m => m && typeof m.content === 'string' && m.content.trim().length > 0)
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content.trim() }]
        }));

    if (contents.length === 0) {
        contents.push({
            role: 'user',
            parts: [{ text: 'Start the interview with the first concise question.' }]
        });
    }

    const body = {
        contents,
        generationConfig: {
            temperature:     options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens   ?? 1024,
            topP: 0.95
        }
    };

    if (options.jsonMode) {
        body.generationConfig.responseMimeType = 'application/json';
    }

    if (systemPrompt) {
        body.system_instruction = { parts: [{ text: systemPrompt }] };
    }

    const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(30_000) // 30s timeout
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `Gemini API error ${res.status}`;
        throw new Error(msg);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text;
}

// ── With automatic fallback ───────────────────────────────────
async function callWithFallback(messages, systemPrompt, options = {}) {
    try {
        return await callGemini(PRIMARY_MODEL, messages, systemPrompt, options);
    } catch (err) {
        console.warn(`Primary model failed (${err.message}), trying fallback…`);
        return await callGemini(FALLBACK_MODEL, messages, systemPrompt, options);
    }
}

// ── Public service functions ──────────────────────────────────

/**
 * Get the next interviewer message (question or follow-up).
 * @param {string} systemPrompt  – Built by buildSystemPrompt()
 * @param {Array}  history       – [{role, content}, …]
 * @returns {string} interviewer text
 */
async function getNextMessage(systemPrompt, history) {
    return callWithFallback(history, systemPrompt, { temperature: 0.7, maxTokens: 512 });
}

/**
 * Score a single answer against a question.
 * Returns a structured JSON object or throws.
 * @param {string} question
 * @param {string} answer
 * @param {string} jobTitle
 * @param {string} difficulty  – beginner | intermediate | advanced
 * @returns {object} scoreData
 */
async function scoreAnswer(question, answer, jobTitle, difficulty) {
    const prompt = `You are an expert interview evaluator for ${jobTitle} roles at ${difficulty} level.

Evaluate this answer and return ONLY a valid JSON object — no markdown, no extra text.

QUESTION: ${question}

ANSWER: ${answer}

Return exactly:
{
  "overall": <integer 0-100>,
  "breakdown": {
    "relevance":    <integer 0-100>,
    "technical":    <integer 0-100>,
    "clarity":      <integer 0-100>,
    "completeness": <integer 0-100>
  },
  "feedback":     "<2-3 sentence assessment>",
  "strengths":    ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "model_answer": "<1-2 sentence ideal answer hint>",
  "confidence":   <float 0.0-1.0>
}

Scoring: relevance=does it answer the question, technical=domain accuracy,
clarity=structure and communication, completeness=coverage of key points.
Be strict: vague answers score below 50, strong answers score 75+.`;

    const raw = await callWithFallback(
        [{ role: 'user', content: prompt }],
        null,
        { temperature: 0.2, maxTokens: 600, jsonMode: true }
    );

    try {
        return normalizeScore(parseJSON(raw));
    } catch (err) {
        console.warn(`scoreAnswer: invalid model JSON, returning safe fallback (${err.message})`);
        return safeScoreFallback();
    }
}

/**
 * Generate final interview feedback from full session.
 * @param {object} sessionData – from memory manager
 * @returns {object} finalFeedback
 */
async function generateFinalFeedback(sessionData) {
    const { jobTitle, difficulty, answers = [] } = sessionData;

    if (answers.length === 0) return defaultFinalFeedback(sessionData);

    const summary = answers.map((a, i) =>
        `Q${i + 1}: ${a.question}\nAnswer: ${a.answer}\nScore: ${a.score}/100`
    ).join('\n\n');

    const prompt = `You are an expert career coach. A candidate just completed a mock ${jobTitle} interview at ${difficulty} level.

Session summary:
${summary}

Return ONLY valid JSON:
{
  "overallScore":     <integer 0-100>,
  "grade":            "<A|B|C|D|F>",
  "summary":          "<3-4 sentence overall assessment>",
  "topStrengths":     ["<s1>", "<s2>", "<s3>"],
  "topWeaknesses":    ["<w1>", "<w2>", "<w3>"],
  "actionPlan":       ["<a1>", "<a2>", "<a3>"],
  "hiringLikelihood": "<percentage e.g. 65%>",
  "categoryScores": {
    "communication":   <0-100>,
    "technical":       <0-100>,
    "problemSolving":  <0-100>,
    "professionalism": <0-100>
  }
}`;

    const raw = await callWithFallback(
        [{ role: 'user', content: prompt }],
        null,
        { temperature: 0.3, maxTokens: 800, jsonMode: true }
    );

    try {
        const parsed = parseJSON(raw);
        return { ...defaultFinalFeedback(sessionData), ...parsed };
    } catch (err) {
        console.warn(`generateFinalFeedback: invalid model JSON, using defaults (${err.message})`);
        return defaultFinalFeedback(sessionData);
    }
}

/**
 * Parse resume text into a concise summary for system prompt injection.
 */
async function parseResume(resumeText) {
    const prompt = `Extract key information from this resume in under 300 words.
Focus on: skills, years of experience, education, and notable achievements.
Return plain text only.\n\nRESUME:\n${resumeText.slice(0, 3000)}`;

    return callWithFallback(
        [{ role: 'user', content: prompt }],
        null,
        { temperature: 0.1, maxTokens: 400 }
    );
}

// ── Helpers ───────────────────────────────────────────────────
function parseJSON(raw) {
    if (typeof raw !== 'string' || !raw.trim()) {
        throw new Error('Empty model response');
    }

    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Best case: already valid JSON object.
    try {
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch (_err) {
        // Continue to object extraction.
    }

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('No JSON object found in response');
    }

    const candidate = cleaned.slice(start, end + 1);
    return JSON.parse(candidate);
}

function normalizeScore(score) {
    return {
        overall: clampNumber(score?.overall),
        breakdown: {
            relevance: clampNumber(score?.breakdown?.relevance),
            technical: clampNumber(score?.breakdown?.technical),
            clarity: clampNumber(score?.breakdown?.clarity),
            completeness: clampNumber(score?.breakdown?.completeness)
        },
        feedback: asString(score?.feedback),
        strengths: asArray(score?.strengths, 2),
        improvements: asArray(score?.improvements, 3),
        model_answer: asString(score?.model_answer),
        confidence: clampConfidence(score?.confidence)
    };
}

function safeScoreFallback() {
    return {
        overall: 50,
        breakdown: {
            relevance: 50,
            technical: 50,
            clarity: 50,
            completeness: 50
        },
        feedback: 'Automatic scoring was partially unavailable. Please review the answer manually.',
        strengths: ['Attempted the question'],
        improvements: ['Add more specific details', 'Include concrete examples', 'Structure the response clearly'],
        model_answer: 'Provide a concise, structured answer with relevant technical depth.',
        confidence: 0.5
    };
}

function clampNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
}

function clampConfidence(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0.5;
    return Math.max(0, Math.min(1, n));
}

function asString(value) {
    return typeof value === 'string' ? value : '';
}

function asArray(value, minLen = 0) {
    const arr = Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.trim().length > 0) : [];
    if (arr.length >= minLen) return arr;
    return arr.concat(Array.from({ length: Math.max(0, minLen - arr.length) }, () => ''));
}

function defaultFinalFeedback(sessionData) {
    const avg   = sessionData.totalScore || 0;
    const grade = avg >= 85 ? 'A' : avg >= 70 ? 'B' : avg >= 55 ? 'C' : avg >= 40 ? 'D' : 'F';
    return {
        overallScore: avg, grade,
        summary: `You completed a ${sessionData.jobTitle} interview with an average score of ${avg}/100.`,
        topStrengths:    ['Completed the full interview', 'Engaged with all questions'],
        topWeaknesses:   ['See per-answer feedback for details'],
        actionPlan:      ['Practice STAR method', 'Review domain fundamentals', 'Daily mock interviews'],
        hiringLikelihood: `${Math.round(avg * 0.8)}%`,
        categoryScores:  { communication: avg, technical: avg, problemSolving: avg, professionalism: avg }
    };
}

module.exports = { getNextMessage, scoreAnswer, generateFinalFeedback, parseResume };
