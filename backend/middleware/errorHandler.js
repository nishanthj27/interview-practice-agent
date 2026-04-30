// ============================================================
// middleware/errorHandler.js
// ============================================================
'use strict';

function notFound(req, res) {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

function errorHandler(err, req, res, _next) {
    const isDev  = process.env.NODE_ENV === 'development';
    const status = err.status || 500;

    // Log full error server-side; never leak stack traces to client
    console.error(`[${new Date().toISOString()}] ${status} ${req.method} ${req.path} —`, err.message);
    if (isDev) console.error(err.stack);

    res.status(status).json({
        error:  err.message || 'Internal server error',
        ...(isDev && { stack: err.stack })
    });
}

module.exports = { notFound, errorHandler };
