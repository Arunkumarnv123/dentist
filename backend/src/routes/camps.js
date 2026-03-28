const express = require('express');
const { body, param } = require('express-validator');
const { Camp } = require('../models');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { auditMiddleware } = require('../middleware/auditLogger');

const router = express.Router();

// GET /api/camps — list all camps accessible to user
router.get('/', authenticate, async (req, res) => {
    try {
        let camps;
        const role = req.userRole || req.user?.role;

        if (role === 'system_admin' || role === 'camp_admin') {
            // Admins see ALL camps including deactivated ones (so they can manage)
            camps = await Camp.findAll({ order: [['start_date', 'DESC']] });
        } else if (role === 'patient') {
            // Patients see only active camps
            camps = await Camp.findAll({
                where: { status: 'active' },
                order: [['start_date', 'DESC']]
            });
        } else if (req.user) {
            // Dentists: only active camps they are assigned to
            // If no camps assigned yet, show all active camps
            const campIds = req.user.camp_ids || [];
            const { Op } = require('sequelize');
            if (campIds.length === 0) {
                camps = await Camp.findAll({
                    where: { status: 'active' },
                    order: [['start_date', 'DESC']],
                });
            } else {
                camps = await Camp.findAll({
                    where: { id: campIds, status: 'active' },
                    order: [['start_date', 'DESC']],
                });
            }
        } else {
            camps = [];
        }
        res.json({ camps });
    } catch (error) {
        console.error('List camps error:', error);
        res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
    }
});

// GET /api/camps/:campId — get single camp (public for registration pages)
router.get('/:campId', async (req, res) => {
    try {
        const camp = await Camp.findByPk(req.params.campId);
        if (!camp) {
            return res.status(404).json({ error: 'Camp not found', code: 'NOT_FOUND' });
        }
        res.json({ camp });
    } catch (error) {
        console.error('Get camp error:', error);
        res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
    }
});

// POST /api/camps — create camp
router.post('/',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin'),
    auditMiddleware('camp.create', 'Camp'),
    [
        body('name').trim().notEmpty().withMessage('Camp name required'),
        body('prefix').trim().notEmpty().isLength({ min: 1, max: 10 }).withMessage('Prefix required (1-10 chars)'),
        body('location').trim().notEmpty().withMessage('Location required'),
        body('start_date').isISO8601().withMessage('Valid start date required'),
        body('end_date').isISO8601().withMessage('Valid end date required'),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, prefix, location, organization, start_date, end_date, contact_info } = req.body;

            const camp = await Camp.create({
                name,
                prefix: prefix.toUpperCase(),
                location,
                organization,
                start_date,
                end_date,
                contact_info,
                status: 'active',
            });

            // Add camp to creator's camp_ids
            const userCampIds = req.user.camp_ids || [];
            userCampIds.push(camp.id);
            await req.user.update({ camp_ids: userCampIds });

            res.status(201).json({ camp });
        } catch (error) {
            console.error('Create camp error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// PUT /api/camps/:campId — update camp
router.put('/:campId',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin'),
    auditMiddleware('camp.update', 'Camp'),
    async (req, res) => {
        try {
            const camp = await Camp.findByPk(req.params.campId);
            if (!camp) {
                return res.status(404).json({ error: 'Camp not found', code: 'NOT_FOUND' });
            }

            const { name, location, organization, start_date, end_date, status, contact_info } = req.body;
            await camp.update({
                name: name || camp.name,
                location: location || camp.location,
                organization: organization !== undefined ? organization : camp.organization,
                start_date: start_date || camp.start_date,
                end_date: end_date || camp.end_date,
                status: status || camp.status,
                contact_info: contact_info !== undefined ? contact_info : camp.contact_info,
            });

            res.json({ camp });
        } catch (error) {
            console.error('Update camp error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// PUT /api/camps/:campId/deactivate — deactivate camp (admin only)
router.put('/:campId/deactivate',
    authenticate,
    rbac('camp_admin', 'system_admin'),
    async (req, res) => {
        try {
            const camp = await Camp.findByPk(req.params.campId);
            if (!camp) {
                return res.status(404).json({ error: 'Camp not found', code: 'NOT_FOUND' });
            }
            if (camp.status === 'cancelled') {
                return res.status(400).json({ error: 'Camp is already deactivated', code: 'ALREADY_INACTIVE' });
            }
            await camp.update({ status: 'cancelled' });
            res.json({ camp, message: 'Camp deactivated successfully' });
        } catch (error) {
            console.error('Deactivate camp error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// PUT /api/camps/:campId/reactivate — reactivate a deactivated camp (admin only)
router.put('/:campId/reactivate',
    authenticate,
    rbac('camp_admin', 'system_admin'),
    async (req, res) => {
        try {
            const camp = await Camp.findByPk(req.params.campId);
            if (!camp) {
                return res.status(404).json({ error: 'Camp not found', code: 'NOT_FOUND' });
            }
            await camp.update({ status: 'active' });
            res.json({ camp, message: 'Camp reactivated successfully' });
        } catch (error) {
            console.error('Reactivate camp error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// DELETE /api/camps/:campId — permanently delete a camp (system_admin only, must be deactivated first)
router.delete('/:campId',
    authenticate,
    rbac('system_admin'),
    async (req, res) => {
        try {
            const camp = await Camp.findByPk(req.params.campId);
            if (!camp) {
                return res.status(404).json({ error: 'Camp not found', code: 'NOT_FOUND' });
            }
            if (camp.status === 'active') {
                return res.status(400).json({
                    error: 'Camp must be deactivated before it can be deleted. Deactivate it first.',
                    code: 'CAMP_STILL_ACTIVE'
                });
            }
            await camp.destroy();
            res.json({ message: 'Camp permanently deleted' });
        } catch (error) {
            console.error('Delete camp error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/camps/:campId/qr — generate QR code for registration link
router.get('/:campId/qr',
    authenticate,
    async (req, res) => {
        try {
            const QRCode = require('qrcode');
            const camp = await Camp.findByPk(req.params.campId);
            if (!camp) {
                return res.status(404).json({ error: 'Camp not found', code: 'NOT_FOUND' });
            }

            const origin = process.env.CORS_ORIGIN || 'http://localhost:4200';
            const registrationUrl = `${origin}/register/${camp.id}`;

            // Generate QR code as data URL (base64 PNG)
            const qrDataUrl = await QRCode.toDataURL(registrationUrl, {
                width: 400,
                margin: 2,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff',
                },
                errorCorrectionLevel: 'H',
            });

            res.json({
                qr_code: qrDataUrl,
                registration_url: registrationUrl,
                camp_name: camp.name,
                camp_prefix: camp.prefix,
            });
        } catch (error) {
            console.error('QR generation error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

module.exports = router;
