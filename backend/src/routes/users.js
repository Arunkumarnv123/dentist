const express = require('express');
const { body } = require('express-validator');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createAuditEntry } = require('../middleware/auditLogger');

const router = express.Router();

// GET /api/users — list users (admin only)
router.get('/',
    authenticate,
    rbac('system_admin'),
    async (req, res) => {
        try {
            const users = await User.findAll({
                attributes: { exclude: ['password'] },
                order: [['createdAt', 'DESC']],
            });
            res.json({ users });
        } catch (error) {
            console.error('List users error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// POST /api/users — create user (admin only)
router.post('/',
    authenticate,
    rbac('system_admin', 'camp_admin'),
    [
        body('name').trim().notEmpty().withMessage('Name required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('role').isIn(['dentist', 'camp_admin', 'system_admin', 'auditor']).withMessage('Invalid role'),
        body('phone').optional({ checkFalsy: true }).trim().matches(/^[0-9]{10}$/).withMessage('Phone must be exactly 10 digits'),
        body('camp_ids').optional().isArray(),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, email, password, role, phone, camp_ids } = req.body;

            // Check if email already exists
            const existing = await User.findOne({ where: { email } });
            if (existing) {
                return res.status(409).json({ error: 'Email already registered', code: 'DUPLICATE' });
            }

            const user = await User.create({
                name, email, password, role,
                phone: phone || null,
                camp_ids: camp_ids || [],
            });

            await createAuditEntry({
                userId: req.userId,
                action: 'user.create',
                targetType: 'User',
                targetId: user.id,
                metadata: { role, email },
                ipAddress: req.ip,
            });

            res.status(201).json({ user: user.toSafeJSON() });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// PUT /api/users/:userId — update user
router.put('/:userId',
    authenticate,
    rbac('system_admin'),
    async (req, res) => {
        try {
            const user = await User.findByPk(req.params.userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
            }

            const { name, role, phone, camp_ids, is_active } = req.body;
            await user.update({
                name: name || user.name,
                role: role || user.role,
                phone: phone !== undefined ? phone : user.phone,
                camp_ids: camp_ids !== undefined ? camp_ids : user.camp_ids,
                is_active: is_active !== undefined ? is_active : user.is_active,
            });

            await createAuditEntry({
                userId: req.userId,
                action: 'user.update',
                targetType: 'User',
                targetId: user.id,
                metadata: { changes: req.body },
                ipAddress: req.ip,
            });

            res.json({ user: user.toSafeJSON() });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

module.exports = router;
