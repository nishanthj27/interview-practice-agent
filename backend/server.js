// ============================================================
// server.js — Interview Practice Partner Backend
// ============================================================
'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const interviewRoutes = require('./routes/interview');
const healthRoutes    = require('./routes/health');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Validate required env vars at startup ────────────────────
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.error('❌  GEMINI_API_KEY is not set in .env — server cannot start.');
    process.exit(1);
}

// ── Security headers ─────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ── CORS ─────────────────────────────────────────────────────
const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || '').split(','),
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
].map(origin => origin && origin.trim().replace(/\/+$/, '')).filter(Boolean);

function isAllowedOrigin(origin) {
    if (!origin) return true;

    const normalizedOrigin = origin.replace(/\/+$/, '');
    return configuredOrigins.some(allowed => {
        if (allowed.includes('*')) {
            const escaped = allowed
                .split('*')
                .map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
                .join('[^.]+');
            return new RegExp(`^${escaped}$`).test(normalizedOrigin);
        }
        return normalizedOrigin === allowed || normalizedOrigin.startsWith(`${allowed}/`);
    });
}

app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (Postman, curl, same-origin)
        if (isAllowedOrigin(origin)) {
            return cb(null, true);
        }
        cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({
    // Resume parsing and rich session payloads can exceed 50kb in development.
    limit: process.env.JSON_BODY_LIMIT || '1mb'
}));

// ── Global rate limiter ───────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,                              // 15 minutes
    max:      parseInt(process.env.RATE_LIMIT_MAX) || 100, // per IP
    standardHeaders: true,
    legacyHeaders:   false,
    message: { error: 'Too many requests. Please wait a moment.' }
});
app.use('/api/', limiter);

// ── Routes ───────────────────────────────────────────────────
app.use('/api', healthRoutes);
app.use('/api', interviewRoutes);

// ── 404 + error handler ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅  Backend running on http://localhost:${PORT}`);
    console.log(`    Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`    Allowed CORS: ${configuredOrigins.join(', ')}`);
});

module.exports = app;
