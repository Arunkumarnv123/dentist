const express = require('express');
const jwt = require('jsonwebtoken');
const { body, query } = require('express-validator');
const { Op } = require('sequelize');
const { User } = require('../models');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { createAuditEntry } = require('../middleware/auditLogger');

const router = express.Router();

// POST /api/auth/login
router.post('/login',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').notEmpty().withMessage('Password required'),
    ],
    validate,
    async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ where: { email } });

            if (!user || !user.is_active) {
                return res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
            }

            const isValid = await user.validatePassword(password);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
            }

            // Update last login
            await user.update({ last_login: new Date() });

            const token = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
            );

            await createAuditEntry({
                userId: user.id,
                action: 'user.login',
                targetType: 'User',
                targetId: user.id,
                ipAddress: req.ip,
            });

            res.json({
                token,
                user: user.toSafeJSON(),
                expiresIn: process.env.JWT_EXPIRES_IN || '8h',
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    res.json({ user: req.user.toSafeJSON() });
});

// POST /api/auth/change-password
router.post('/change-password',
    authenticate,
    [
        body('currentPassword').notEmpty(),
        body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    validate,
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const user = await User.findByPk(req.userId);

            const isValid = await user.validatePassword(currentPassword);
            if (!isValid) {
                return res.status(400).json({ error: 'Current password is incorrect', code: 'INVALID_PASSWORD' });
            }

            user.password = newPassword;
            await user.save();

            await createAuditEntry({
                userId: user.id,
                action: 'user.password_change',
                targetType: 'User',
                targetId: user.id,
                ipAddress: req.ip,
            });

            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// POST /api/auth/register-patient — self-service patient registration
router.post('/register-patient',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('phone').optional().trim().matches(/^[0-9]{10}$/).withMessage('Phone must be exactly 10 digits'),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, email, password, phone } = req.body;

            // Check if email already exists
            const existing = await User.findOne({ where: { email } });
            if (existing) {
                return res.status(409).json({ error: 'Email already registered', code: 'DUPLICATE_EMAIL' });
            }

            const user = await User.create({
                name,
                email,
                password,
                phone: phone || null,
                role: 'patient',
            });

            const token = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
            );

            await createAuditEntry({
                userId: user.id,
                action: 'patient.register',
                targetType: 'User',
                targetId: user.id,
                ipAddress: req.ip,
            });

            res.status(201).json({
                token,
                user: user.toSafeJSON(),
                message: 'Registration successful',
            });
        } catch (error) {
            console.error('Patient registration error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// POST /api/auth/register-dentist — self-service dentist registration
router.post('/register-dentist',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('phone').optional().trim().matches(/^[0-9]{10}$/).withMessage('Phone must be exactly 10 digits'),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, email, password, phone } = req.body;

            // Check if email already exists
            const existing = await User.findOne({ where: { email } });
            if (existing) {
                return res.status(409).json({ error: 'Email already registered', code: 'DUPLICATE_EMAIL' });
            }

            const user = await User.create({
                name,
                email,
                password,
                phone: phone || null,
                role: 'dentist',
            });

            const token = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
            );

            await createAuditEntry({
                userId: user.id,
                action: 'dentist.register',
                targetType: 'User',
                targetId: user.id,
                ipAddress: req.ip,
            });

            res.status(201).json({
                token,
                user: user.toSafeJSON(),
                message: 'Registration successful',
            });
        } catch (error) {
            console.error('Dentist registration error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// ── Forgot Password Feature (FB Style) ──

// 1. Search account
router.get('/search-account',
    [query('identifier').notEmpty()],
    validate,
    async (req, res) => {
        try {
            const { identifier } = req.query;
            const user = await User.findOne({
                where: {
                    [Op.or]: [
                        { email: identifier },
                        { phone: identifier }
                    ]
                },
                attributes: ['id', 'name', 'email', 'phone', 'role']
            });

            if (!user) {
                return res.status(404).json({ error: 'No account found', code: 'ACCOUNT_NOT_FOUND' });
            }

            res.json({ user });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// 2. Request OTP
router.post('/forgot-password',
    [body('userId').notEmpty()],
    validate,
    async (req, res) => {
        try {
            const { userId } = req.body;
            const user = await User.findByPk(userId);

            if (!user) return res.status(404).json({ error: 'User not found' });

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

            await user.update({
                reset_password_otp: otp,
                reset_password_expiry: expiry
            });

            // SIMULATION: Log to console since we don't have SMTP config
            console.log(`\n🔑 RESET CODE for ${user.email}: ${otp}\n`);

            res.json({
                message: 'Reset code sent',
                destination: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // mask email
            });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// 3. Verify OTP
router.post('/verify-otp',
    [
        body('userId').notEmpty(),
        body('otp').isLength({ min: 6, max: 6 })
    ],
    validate,
    async (req, res) => {
        try {
            const { userId, otp } = req.body;
            const user = await User.findOne({
                where: {
                    id: userId,
                    reset_password_otp: otp,
                    reset_password_expiry: { [Op.gt]: new Date() }
                }
            });

            if (!user) {
                return res.status(400).json({ error: 'Invalid or expired code', code: 'INVALID_OTP' });
            }

            res.json({ message: 'Code verified', success: true });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// 4. Reset Password
router.post('/reset-password',
    [
        body('userId').notEmpty(),
        body('otp').notEmpty(),
        body('newPassword').isLength({ min: 6 })
    ],
    validate,
    async (req, res) => {
        try {
            const { userId, otp, newPassword } = req.body;
            const user = await User.findOne({
                where: {
                    id: userId,
                    reset_password_otp: otp,
                    reset_password_expiry: { [Op.gt]: new Date() }
                }
            });

            if (!user) {
                return res.status(400).json({ error: 'Session expired. Please start over.', code: 'INVALID_SESSION' });
            }

            // Update password
            user.password = newPassword;
            user.reset_password_otp = null;
            user.reset_password_expiry = null;
            await user.save();

            await createAuditEntry({
                userId: user.id,
                action: 'user.password_reset',
                targetType: 'User',
                targetId: user.id,
                ipAddress: req.ip,
            });

            res.json({ message: 'Password reset successful. You can now log in.' });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

module.exports = router;
