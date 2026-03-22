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
        if (req.user.role === 'system_admin' || req.user.role === 'patient') {
            // Admins and patients see all camps
            camps = await Camp.findAll({ order: [['start_date', 'DESC']] });
        } else {
            const campIds = req.user.camp_ids || [];
            camps = await Camp.findAll({
                where: { id: campIds },
                order: [['start_date', 'DESC']],
            });
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
    rbac('camp_admin', 'system_admin'),
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
    rbac('camp_admin', 'system_admin'),
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
