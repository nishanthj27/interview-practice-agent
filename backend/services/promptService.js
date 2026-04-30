// ============================================================
// services/promptService.js
// Builds the system prompt from job + settings + user profile
// ============================================================
'use strict';

const JOBS = require('../data/jobs');

const DIFFICULTY_INSTRUCTIONS = {
    beginner:     'Ask foundational questions. Focus on basic concepts and motivation. Avoid deep technical dives.',
    intermediate: 'Mix conceptual and applied questions. Expect practical examples from 1-3 years of experience.',
    advanced:     'Ask deep, complex questions. Expect nuanced trade-offs, architectural decisions, and leadership examples.'
};

const PERSONALITY_INSTRUCTIONS = {
    friendly: 'Be warm, encouraging, and supportive. Celebrate strong answers. Gently guide when they struggle.',
    neutral:  'Be professional and balanced. Keep a neutral tone. Neither overly encouraging nor critical.',
    tough:    'Be demanding and direct. Push back on weak or vague answers. Ask rapid follow-ups. Simulate a high-pressure FAANG-style environment.'
};

/**
 * Build the full system prompt for the interviewer.
 * @param {string} jobId
 * @param {object} settings   – { difficulty, personality }
 * @param {object} userInfo   – { fullName, organization, degree, currentRole }
 * @param {string} resumeText – optional parsed resume summary
 */
function buildSystemPrompt(jobId, settings, userInfo, resumeText) {
    const job = JOBS.find(j => j.id === jobId);
    if (!job) throw new Error(`Unknown jobId: ${jobId}`);

    const diff = settings.difficulty  || 'intermediate';
    const pers = settings.personality || 'neutral';

    const resumeSection = resumeText
        ? `\n\nCANDIDATE RESUME SUMMARY:\n${resumeText.slice(0, 1500)}\nUse these specific details to ask targeted, personalized questions about their experience.`
        : '';

    return `${job.systemPrompt}

DIFFICULTY: ${diff.toUpperCase()} — ${DIFFICULTY_INSTRUCTIONS[diff] || DIFFICULTY_INSTRUCTIONS.intermediate}

PERSONALITY: ${pers.toUpperCase()} — ${PERSONALITY_INSTRUCTIONS[pers] || PERSONALITY_INSTRUCTIONS.neutral}

CANDIDATE PROFILE:
- Name         : ${userInfo?.fullName     || 'Candidate'}
- Organization : ${userInfo?.organization || 'Unknown'}
- Degree       : ${userInfo?.degree       || 'Unknown'}
- Current Role : ${userInfo?.currentRole  || 'Unknown'}
${resumeSection}

DYNAMIC FOLLOW-UP RULES (critical — follow these strictly):
1. After each answer, decide ONE of: clarify, probe deeper, pivot to next topic, or acknowledge and advance.
2. If the answer is incomplete → ask a direct follow-up about the missing part.
3. If the answer reveals a knowledge gap → explore it further with a simpler follow-up.
4. If the answer is strong → acknowledge briefly, then ask a harder related question.
5. Track topics already covered. Do NOT repeat questions.
6. Ask ONE question at a time. Never list multiple questions.

OUTPUT: Plain conversational text only. No JSON, no markdown headers, no bullet lists.`;
}

module.exports = { buildSystemPrompt };
