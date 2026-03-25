const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { User } = require('../models');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { createAuditEntry } = require('../middleware/auditLogger');
require('dotenv').config();

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

// POST /api/auth/refresh — issue a fresh token while the current one is still valid
router.post('/refresh', authenticate, async (req, res) => {
    try {
        const token = jwt.sign(
            { userId: req.user.id, role: req.user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        res.json({
            token,
            expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        });
    } catch (error) {
        console.error('Token refresh error:', error);
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

// POST /api/auth/register-patient — self-service patient registration
router.post('/register-patient',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('phone').optional({ checkFalsy: true }).trim().matches(/^[0-9]{10}$/).withMessage('Phone must be exactly 10 digits'),
    ],
    validate,
    async (req, res) => {
        try {
            const { name, email, password, phone, aadhaar_number } = req.body;

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
        body('phone').optional({ checkFalsy: true }).trim().matches(/^[0-9]{10}$/).withMessage('Phone must be exactly 10 digits'),
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

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password — send OTP to email
// ─────────────────────────────────────────────
router.post('/forgot-password',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    ],
    validate,
    async (req, res) => {
        try {
            // Pre-check: SMTP must be configured
            if (!process.env.SMTP_EMAIL || process.env.SMTP_EMAIL === 'your-gmail@gmail.com' ||
                !process.env.SMTP_PASSWORD || process.env.SMTP_PASSWORD === 'your-app-password-here') {
                return res.status(503).json({
                    error: 'Email service is not configured. Please set SMTP_EMAIL and SMTP_PASSWORD in the server .env file.',
                    code: 'EMAIL_NOT_CONFIGURED',
                });
            }

            const { email } = req.body;
            const user = await User.findOne({ where: { email } });

            // Always return success to prevent email enumeration
            if (!user || !user.is_active) {
                return res.json({ message: 'If this email is registered, you will receive a verification code.' });
            }

            // Generate 6-digit OTP
            const otp = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            await user.update({
                reset_otp: otp,
                reset_otp_expires: expiresAt,
            });

            // Send OTP email
            const { sendOTPEmail } = require('../services/emailService');
            const result = await sendOTPEmail(email, otp, user.name);

            if (!result.success) {
                console.error('Failed to send OTP email:', result.error);
                return res.status(500).json({
                    error: 'Failed to send verification email. Please check SMTP settings and try again.',
                    code: 'EMAIL_SEND_FAILED',
                });
            }

            await createAuditEntry({
                userId: user.id,
                action: 'user.forgot_password',
                targetType: 'User',
                targetId: user.id,
                ipAddress: req.ip,
            });

            res.json({ message: 'If this email is registered, you will receive a verification code.' });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// ─────────────────────────────────────────────
// POST /api/auth/verify-otp — verify the OTP code
// ─────────────────────────────────────────────
router.post('/verify-otp',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
    ],
    validate,
    async (req, res) => {
        try {
            const { email, otp } = req.body;
            const user = await User.findOne({ where: { email } });

            if (!user) {
                return res.status(400).json({ error: 'Invalid or expired verification code.', code: 'INVALID_OTP' });
            }

            if (!user.reset_otp || user.reset_otp !== otp) {
                return res.status(400).json({ error: 'Invalid verification code.', code: 'INVALID_OTP' });
            }

            if (!user.reset_otp_expires || new Date() > user.reset_otp_expires) {
                await user.update({ reset_otp: null, reset_otp_expires: null });
                return res.status(400).json({ error: 'Verification code has expired. Please request a new one.', code: 'OTP_EXPIRED' });
            }

            res.json({ message: 'OTP verified successfully.', verified: true });
        } catch (error) {
            console.error('Verify OTP error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// ─────────────────────────────────────────────
// POST /api/auth/reset-password — reset password after OTP verification
// ─────────────────────────────────────────────
router.post('/reset-password',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
        body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
        body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    validate,
    async (req, res) => {
        try {
            const { email, otp, newPassword } = req.body;
            const user = await User.findOne({ where: { email } });

            if (!user) {
                return res.status(400).json({ error: 'Invalid request.', code: 'INVALID_OTP' });
            }

            if (!user.reset_otp || user.reset_otp !== otp) {
                return res.status(400).json({ error: 'Invalid verification code.', code: 'INVALID_OTP' });
            }

            if (!user.reset_otp_expires || new Date() > user.reset_otp_expires) {
                await user.update({ reset_otp: null, reset_otp_expires: null });
                return res.status(400).json({ error: 'Verification code has expired.', code: 'OTP_EXPIRED' });
            }

            // Reset password and clear OTP
            user.password = newPassword;
            user.reset_otp = null;
            user.reset_otp_expires = null;
            await user.save();

            await createAuditEntry({
                userId: user.id,
                action: 'user.password_reset',
                targetType: 'User',
                targetId: user.id,
                ipAddress: req.ip,
            });

            res.json({ message: 'Password reset successful. You can now log in with your new password.' });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// ─────────────────────────────────────────────
// POST /api/auth/social-login — handle social login/registration (Google, etc.)
// ─────────────────────────────────────────────
router.post('/social-login',
    [
        body('provider').isIn(['google', 'facebook', 'twitter']).withMessage('Invalid provider'),
        body('token').notEmpty().withMessage('Token required'),
    ],
    validate,
    async (req, res) => {
        try {
            const { provider, token } = req.body;

            let socialEmail, socialName;

            if (provider === 'google') {
                // Verify Google ID token via Google's tokeninfo endpoint
                const https = require('https');
                const googleData = await new Promise((resolve, reject) => {
                    https.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`, (resp) => {
                        let data = '';
                        resp.on('data', chunk => data += chunk);
                        resp.on('end', () => {
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.error_description) {
                                    reject(new Error(parsed.error_description));
                                } else {
                                    resolve(parsed);
                                }
                            } catch (e) {
                                reject(new Error('Invalid Google response'));
                            }
                        });
                    }).on('error', reject);
                });

                socialEmail = googleData.email;
                socialName = googleData.name || googleData.email.split('@')[0];

                if (!googleData.email_verified || googleData.email_verified === 'false') {
                    return res.status(400).json({ error: 'Google email not verified', code: 'UNVERIFIED_EMAIL' });
                }
            } else {
                return res.status(400).json({
                    error: `${provider} login is coming soon. Please register with email/password.`,
                    code: 'UNSUPPORTED_PROVIDER',
                });
            }

            // Check if user already exists
            let user = await User.findOne({ where: { email: socialEmail } });

            if (user) {
                // Existing user — log them in
                if (!user.is_active) {
                    return res.status(401).json({ error: 'Account is deactivated', code: 'UNAUTHORIZED' });
                }
                await user.update({ last_login: new Date() });
            } else {
                // New user — create patient account
                const randomPassword = require('crypto').randomBytes(16).toString('hex');
                user = await User.create({
                    name: socialName,
                    email: socialEmail,
                    password: randomPassword,
                    role: 'patient',
                });
            }

            const jwtToken = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
            );

            await createAuditEntry({
                userId: user.id,
                action: `user.social_login.${provider}`,
                targetType: 'User',
                targetId: user.id,
                ipAddress: req.ip,
            });

            res.json({
                token: jwtToken,
                user: user.toSafeJSON(),
                expiresIn: process.env.JWT_EXPIRES_IN || '8h',
                isNewUser: !user.last_login,
            });
        } catch (error) {
            console.error('Social login error:', error);
            res.status(400).json({ error: error.message || 'Social login failed', code: 'SOCIAL_AUTH_FAILED' });
        }
    }
);

module.exports = router;
