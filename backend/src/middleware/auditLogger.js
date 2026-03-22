const { AuditLog } = require('../models');

/**
 * Create an audit log entry.
 */
const createAuditEntry = async ({ userId, action, targetType, targetId, metadata, ipAddress }) => {
    try {
        await AuditLog.create({
            user_id: userId || null,
            action,
            target_type: targetType || null,
            target_id: targetId || null,
            metadata: metadata || {},
            ip_address: ipAddress || null,
        });
    } catch (error) {
        console.error('Failed to create audit log:', error.message);
        // Don't throw — audit failures should not break main flows
    }
};

/**
 * Middleware that auto-logs mutations (POST, PUT, PATCH, DELETE).
 */
const auditMiddleware = (action, targetType) => {
    return async (req, res, next) => {
        // Store original json method to intercept response
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            // Log successful mutations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const targetId = req.params.patientId || req.params.screeningId || req.params.campId || (body && body.id);
                createAuditEntry({
                    userId: req.userId,
                    action,
                    targetType,
                    targetId: targetId || null,
                    metadata: { method: req.method, path: req.originalUrl },
                    ipAddress: req.ip,
                });
            }
            return originalJson(body);
        };
        next();
    };
};

module.exports = { createAuditEntry, auditMiddleware };
