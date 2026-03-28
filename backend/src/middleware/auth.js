const jwt = require('jsonwebtoken');
const { User, Patient } = require('../models');
require('dotenv').config();

/**
 * JWT Authentication middleware.
 * Supports both staff tokens (userId) and patient tokens (patientId).
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ── Patient token ──
        if (decoded.type === 'patient' && decoded.patientId) {
            const patient = await Patient.findByPk(decoded.patientId);
            if (!patient) {
                return res.status(401).json({ error: 'Invalid patient token', code: 'UNAUTHORIZED' });
            }
            req.patientId = patient.id;
            req.patient = patient;
            req.userId = null;
            req.user = null;
            req.userRole = 'patient';
            return next();
        }

        // ── Staff token ──
        if (decoded.userId) {
            const user = await User.findByPk(decoded.userId);
            if (!user || !user.is_active) {
                return res.status(401).json({ error: 'Invalid or inactive user', code: 'UNAUTHORIZED' });
            }
            req.user = user;
            req.userId = user.id;
            req.userRole = user.role;
            return next();
        }

        return res.status(401).json({ error: 'Invalid token payload', code: 'UNAUTHORIZED' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' });
    }
};

/**
 * Optional authentication — attaches user if token present, but doesn't require it.
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.type === 'patient' && decoded.patientId) {
                const patient = await Patient.findByPk(decoded.patientId);
                if (patient) {
                    req.patientId = patient.id;
                    req.patient = patient;
                }
            } else if (decoded.userId) {
                const user = await User.findByPk(decoded.userId);
                if (user && user.is_active) {
                    req.user = user;
                    req.userId = user.id;
                }
            }
        }
    } catch (e) {
        // Ignore auth errors for optional auth
    }
    next();
};

module.exports = { authenticate, optionalAuth };
