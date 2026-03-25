const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * JWT Authentication middleware.
 * Extracts token from Authorization header, verifies it, and attaches user to req.
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findByPk(decoded.userId);
        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Invalid or inactive user', code: 'UNAUTHORIZED' });
        }

        req.user = user;
        req.userId = user.id;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' });
    }
};

/**
 * Optional authentication — attaches user if token present, but doesn't require it.
 * Used for public endpoints like patient registration.
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findByPk(decoded.userId);
            if (user && user.is_active) {
                req.user = user;
                req.userId = user.id;
            }
        }
    } catch (e) {
        // Ignore auth errors for optional auth
    }
    next();
};

module.exports = { authenticate, optionalAuth };
