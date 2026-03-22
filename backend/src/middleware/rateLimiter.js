const rateLimit = require('express-rate-limit');

// Rate limiter for public registration endpoint
const registrationLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 registrations per minute per IP
    message: {
        error: 'Too many registrations, please try again later',
        code: 'RATE_LIMITED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per 15 min
    message: {
        error: 'Too many login attempts, please try again later',
        code: 'RATE_LIMITED',
    },
});

// General API limiter
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200,
    message: {
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMITED',
    },
});

module.exports = { registrationLimiter, authLimiter, apiLimiter };
