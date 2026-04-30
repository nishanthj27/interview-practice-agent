// ============================================================
// config.js — Frontend configuration
// NO API keys here. All secrets live in the backend .env file.
// ============================================================

const runtimeConfig = window.__APP_CONFIG__ || {};

function normalizeApiBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
}

function getDefaultApiBaseUrl() {
    const localHosts = ['localhost', '127.0.0.1', ''];
    if (localHosts.includes(window.location.hostname)) {
        return 'http://localhost:3001';
    }
    return '';
}

const CONFIG = {
    // ── Backend API URL ───────────────────────────────────────
    // Development:  http://localhost:3001
    // Production:   https://your-backend.onrender.com  (set after deploy)
    API_BASE_URL: normalizeApiBaseUrl(runtimeConfig.API_BASE_URL || getDefaultApiBaseUrl()),

    // ── Interview settings ────────────────────────────────────
    INTERVIEW_DURATION:       600,
    TIMER_WARNING_THRESHOLD:  180,
    TIMER_DANGER_THRESHOLD:   60,

    // ── Voice config ──────────────────────────────────────────
    VOICE_RATE:             1.0,
    VOICE_PITCH:            1.0,
    VOICE_VOLUME:           1.0,
    VAD_SILENCE_DURATION:   1500,

    // ── Difficulty levels ─────────────────────────────────────
    DIFFICULTY_LEVELS: [
        { id: 'beginner',     label: 'Beginner',     icon: '🌱', desc: 'Entry-level / fresher' },
        { id: 'intermediate', label: 'Intermediate',  icon: '⚡', desc: '1–3 years experience' },
        { id: 'advanced',     label: 'Advanced',      icon: '🔥', desc: '3+ years / senior' }
    ],

    // ── Interviewer personalities ─────────────────────────────
    PERSONALITIES: [
        { id: 'friendly', label: 'Friendly', icon: '😊', desc: 'Warm, encouraging' },
        { id: 'neutral',  label: 'Neutral',  icon: '🎯', desc: 'Professional, balanced' },
        { id: 'tough',    label: 'Tough',    icon: '💼', desc: 'High-pressure, challenging' }
    ],

    // ── Analytics storage ─────────────────────────────────────
    ANALYTICS_KEY: 'interview_sessions_v2',

    // Jobs are loaded dynamically from GET /api/jobs
    JOBS: [] // populated at runtime by app.js
};

// ── Helpers ───────────────────────────────────────────────────
function getJobById(id)        { return CONFIG.JOBS.find(j => j.id === id) || null; }
function getDifficultyById(id) { return CONFIG.DIFFICULTY_LEVELS.find(d => d.id === id) || CONFIG.DIFFICULTY_LEVELS[1]; }
function getPersonalityById(id){ return CONFIG.PERSONALITIES.find(p => p.id === id) || CONFIG.PERSONALITIES[1]; }
function formatTime(s)         { return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; }
