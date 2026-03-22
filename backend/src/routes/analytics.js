const express = require('express');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { getCampAnalytics } = require('../services/analyticsService');

const router = express.Router();

// GET /api/analytics/camps/:campId — get camp analytics
router.get('/camps/:campId',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin', 'auditor'),
    async (req, res) => {
        try {
            const analytics = await getCampAnalytics(req.params.campId);
            res.json(analytics);
        } catch (error) {
            console.error('Analytics error:', error);
            if (error.message === 'Camp not found') {
                return res.status(404).json({ error: 'Camp not found', code: 'NOT_FOUND' });
            }
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

module.exports = router;
