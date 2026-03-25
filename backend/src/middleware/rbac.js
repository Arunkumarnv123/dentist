/**
 * Role-Based Access Control middleware.
 * Usage: rbac('dentist', 'camp_admin', 'system_admin')
 */
const rbac = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
            });
        }

        next();
    };
};

/**
 * Camp access control — ensures user has access to the requested camp.
 * System admins bypass this check.
 */
const campAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }

    // System admins have global access
    if (req.user.role === 'system_admin') {
        return next();
    }

    const campId = req.params.campId;
    if (!campId) {
        return next();
    }

    const userCampIds = req.user.camp_ids || [];
    if (!userCampIds.includes(campId)) {
        return res.status(403).json({
            error: 'No access to this camp',
            code: 'CAMP_ACCESS_DENIED',
        });
    }

    next();
};

module.exports = { rbac, campAccess };
