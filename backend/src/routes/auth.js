const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { Op } = require('sequelize');
const { User, Patient } = require('../models');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { createAuditEntry } = require('../middleware/auditLogger');
require('dotenv').config();

const router = express.Router();

/**
 * POST /api/auth/login
 * Supports:
 *  - Staff: { email, password }
 *  - Patient: { phone, passkey }
 *  - Mixed: { identifier (email or phone), credential (password or passkey) }
 */
router.post('/login',
    authLimiter,
    [
        body('identifier').optional().trim().notEmpty(),
        body('email').optional().isEmail().normalizeEmail(),
        body('phone').optional().trim().matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
        body('password').optional().notEmpty(),
        body('passkey').optional().notEmpty(),
        body('credential').optional().notEmpty(),
    ],
    async (req, res) => {
        try {
            const { identifier, email, phone, password, passkey, credential } = req.body;

            // Resolve the login identifier
            const loginId = identifier || email || phone;
            const loginCred = credential || password || passkey;

            if (!loginId || !loginCred) {
                return res.status(400).json({ error: 'Email/Phone and Password/Passkey are required', code: 'VALIDATION_ERROR' });
            }

            // Determine if identifier is email or phone
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginId);
            const isPhone = /^[0-9]{10}$/.test(loginId);

            // ── Patient login via phone + passkey ──
            if (isPhone) {
                const patient = await Patient.findOne({
                    where: { phone: loginId },
                    order: [['registered_at', 'DESC']],
                });

                if (patient && patient.passkey) {
                    const isValidPasskey = await patient.validatePasskey(loginCred);
                    if (isValidPasskey) {
                        const token = jwt.sign(
                            { patientId: patient.id, role: 'patient', type: 'patient' },
                            process.env.JWT_SECRET,
                            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
                        );

                        await createAuditEntry({
                            userId: null,
                            action: 'patient.login',
                            targetType: 'Patient',
                            targetId: patient.id,
                            ipAddress: req.ip,
                        });

                        return res.json({
                            token,
                            user: {
                                id: patient.id,
                                name: patient.full_name,
                                phone: patient.phone,
                                role: 'patient',
                                patient_id: patient.patient_id,
                                camp_id: patient.camp_id,
                            },
                            expiresIn: process.env.JWT_EXPIRES_IN || '8h',
                        });
                    }
                }
                // Fall through to staff login if phone matches a User record
            }

            // ── Staff login via email + password ──
            if (isEmail || !isPhone) {
                const whereClause = isEmail ? { email: loginId } : { email: loginId };
                const user = await User.findOne({ where: whereClause });

                if (!user || !user.is_active) {
                    return res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
                }

                const isValid = await user.validatePassword(loginCred);
                if (!isValid) {
                    return res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
                }

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

                return res.json({
                    token,
                    user: user.toSafeJSON(),
                    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
                });
            }

            return res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    try {
        if (req.patientId) {
            // Patient token
            const { Patient: PatientModel } = require('../models');
            const patient = await PatientModel.findByPk(req.patientId);
            if (!patient) return res.status(404).json({ error: 'Patient not found' });
            return res.json({
                user: {
                    id: patient.id,
                    name: patient.full_name,
                    phone: patient.phone,
                    role: 'patient',
                    patient_id: patient.patient_id,
                    camp_id: patient.camp_id,
                }
            });
        }
        res.json({ user: req.user.toSafeJSON() });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
    }
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

// POST /api/auth/register-patient — self-service patient registration with passkey
router.post('/register-patient',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('phone').trim().matches(/^[0-9]{10}$/).withMessage('Phone must be exactly 10 digits'),
        body('passkey').isLength({ min: 4, max: 20 }).withMessage('Passkey must be 4–20 characters'),
        body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Valid email required'),
        body('age').isInt({ min: 0, max: 120 }).withMessage('Age must be 0–120'),
        body('gender').isIn(['male', 'female', 'other']).withMessage('Gender required'),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, phone, passkey, email, age, gender, address, city, camp_id } = req.body;

            // Check if phone already registered as a User (patient role)
            const existingUser = await User.findOne({ where: { phone } });
            if (existingUser) {
                return res.status(409).json({ error: 'Phone number already registered', code: 'DUPLICATE_PHONE' });
            }

            // Create patient user account
            const user = await User.create({
                name,
                email: email || `patient_${phone}@dentalcamp.local`,
                password: passkey, // stored as password hash in User for staff table
                phone,
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

module.exports = router;
