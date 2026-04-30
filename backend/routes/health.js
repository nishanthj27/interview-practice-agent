// ============================================================
// routes/health.js
// ============================================================
'use strict';

const express = require('express');
const router  = express.Router();

// GET /api/health
router.get('/health', (req, res) => {
    res.json({
        status:      'ok',
        service:     'Interview Practice Partner API',
        environment: process.env.NODE_ENV || 'development',
        timestamp:   new Date().toISOString()
    });
});

module.exports = router;
