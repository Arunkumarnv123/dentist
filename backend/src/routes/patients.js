const express = require('express');
const { body, query } = require('express-validator');
const { Op } = require('sequelize');
const { Patient, QueueEntry, Camp, Screening, Report } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registrationLimiter } = require('../middleware/rateLimiter');
const { generatePatientId } = require('../services/patientIdService');
const { createAuditEntry } = require('../middleware/auditLogger');

const router = express.Router();

// POST /api/camps/:campId/register — register patient at camp kiosk (public, no login required)
router.post('/:campId/register',
    registrationLimiter,
    optionalAuth,
    [
        body('full_name').trim().notEmpty().withMessage('Full name required'),
        body('age').isInt({ min: 0, max: 120 }).withMessage('Age must be 0-120'),
        body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
        body('phone')
            .trim()
            .notEmpty().withMessage('Phone number is required')
            .matches(/^[0-9]{10}$/).withMessage('Phone must be exactly 10 digits'),
        body('passkey')
            .optional({ checkFalsy: true })
            .isLength({ min: 4, max: 20 }).withMessage('Passkey must be 4-20 characters'),
        body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email'),
        body('address').optional({ nullable: true }).trim(),
        body('city').optional({ nullable: true }).trim(),
        body('idempotency_key').optional().trim(),
        body('priority').optional().isIn(['normal', 'urgent', 'mobility_issues']),
    ],
    validate,
    async (req, res) => {
        try {
            const campId = req.params.campId;

            // Verify camp exists and is active
            const camp = await Camp.findByPk(campId);
            if (!camp) {
                return res.status(404).json({ error: 'Camp not found', code: 'NOT_FOUND' });
            }
            if (camp.status !== 'active') {
                return res.status(400).json({ error: 'Camp is not active', code: 'CAMP_INACTIVE' });
            }

            const { full_name, age, gender, phone, passkey, email, address, city, idempotency_key, priority } = req.body;

            // Idempotency check — if same key already used, return existing patient
            if (idempotency_key) {
                const existing = await Patient.findOne({ where: { idempotency_key } });
                if (existing) {
                    const queueEntry = await QueueEntry.findOne({ where: { patient_id: existing.id } });
                    return res.status(200).json({
                        patient: { ...existing.toJSON(), passkey: undefined },
                        queue: queueEntry,
                        message: 'Patient already registered (idempotent)',
                    });
                }
            }

            // Duplicate detection: same phone in same camp
            let duplicateWarning = null;
            const duplicate = await Patient.findOne({
                where: { camp_id: campId, phone },
            });
            if (duplicate) {
                duplicateWarning = {
                    message: 'A patient with this phone number already exists in this camp',
                    existing_patient_id: duplicate.patient_id,
                    existing_id: duplicate.id,
                };
            }

            // Generate concurrency-safe Patient ID
            const patientId = await generatePatientId(campId);

            // Create patient
            const patient = await Patient.create({
                patient_id: patientId,
                camp_id: campId,
                full_name: full_name.trim(),
                age,
                gender,
                phone,
                passkey: passkey || null,
                email: email || null,
                address: address || null,
                city: city || null,
                idempotency_key: idempotency_key || null,
                registered_at: new Date(),
            });

            // Add to queue
            const queueEntry = await QueueEntry.create({
                patient_id: patient.id,
                camp_id: campId,
                status: 'pending',
                priority: priority || 'normal',
                queued_at: new Date(),
            });

            // Audit log
            await createAuditEntry({
                userId: req.userId || null,
                action: 'patient.register',
                targetType: 'Patient',
                targetId: patient.id,
                metadata: { patient_id: patientId, camp_id: campId },
                ipAddress: req.ip,
            });

            const response = {
                patient: { ...patient.toJSON(), passkey: undefined }, // never expose hashed passkey
                queue: queueEntry,
                message: 'Registration successful',
            };

            if (duplicateWarning) {
                response.duplicate_warning = duplicateWarning;
            }

            res.status(201).json(response);
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/camps/:campId/patients — list patients with search and pagination
router.get('/:campId/patients',
    authenticate,
    async (req, res) => {
        try {
            // Deny patient tokens from listing all patients
            if (req.patientId) {
                return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
            }

            const { search, page = 1, limit = 50 } = req.query;
            const campId = req.params.campId;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            const where = { camp_id: campId };

            if (search) {
                where[Op.or] = [
                    { patient_id: { [Op.like]: `%${search}%` } },
                    { full_name: { [Op.like]: `%${search}%` } },
                    { phone: { [Op.like]: `%${search}%` } },
                    { city: { [Op.like]: `%${search}%` } },
                ];
            }

            const { count, rows } = await Patient.findAndCountAll({
                where,
                attributes: { exclude: ['passkey'] }, // never expose hashed passkey
                include: [
                    { model: QueueEntry, as: 'queueEntry' },
                    {
                        model: Screening,
                        as: 'screenings',
                        required: false,
                        limit: 1,
                        order: [['createdAt', 'DESC']],
                    },
                ],
                order: [['registered_at', 'DESC']],
                limit: parseInt(limit),
                offset,
            });

            res.json({
                patients: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / parseInt(limit)),
                },
            });
        } catch (error) {
            console.error('List patients error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/camps/:campId/patients/:patientId — get single patient
router.get('/:campId/patients/:patientId',
    authenticate,
    async (req, res) => {
        try {
            // Patient can only access their own record
            if (req.patientId && req.patientId !== req.params.patientId) {
                return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
            }

            const patient = await Patient.findOne({
                where: { id: req.params.patientId, camp_id: req.params.campId },
                attributes: { exclude: ['passkey'] },
                include: [
                    { model: QueueEntry, as: 'queueEntry' },
                    { model: Screening, as: 'screenings', order: [['createdAt', 'DESC']] },
                ],
            });

            if (!patient) {
                return res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });
            }

            res.json({ patient });
        } catch (error) {
            console.error('Get patient error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/camps/:campId/status/:patientId — public patient live queue status
router.get('/:campId/status/:patientId', async (req, res) => {
    try {
        const { campId, patientId } = req.params;
        const patient = await Patient.findOne({
            where: { patient_id: patientId, camp_id: campId },
            attributes: { exclude: ['passkey'] },
            include: [{ model: QueueEntry, as: 'queueEntry' }]
        });

        if (!patient || !patient.queueEntry) {
            if (patient) {
                return res.json({
                    patient_name: patient.full_name,
                    patient_id: patient.patient_id,
                    status: 'screened',
                    estimated_wait_minutes: 0,
                    queue_position: 0
                });
            }
            return res.status(404).json({ error: 'Patient not found' });
        }

        const q = patient.queueEntry;
        if (q.status === 'screened') {
            return res.json({
                patient_name: patient.full_name,
                patient_id: patient.patient_id,
                status: 'screened',
                estimated_wait_minutes: 0,
                queue_position: 0
            });
        }

        const allQueue = await QueueEntry.findAll({
            where: { camp_id: campId, status: { [Op.in]: ['pending', 'in_progress'] } },
            order: [
                ['priority', 'ASC'],
                ['queued_at', 'ASC'],
            ]
        });

        const index = allQueue.findIndex(e => e.patient_id === patient.id);
        const peopleAhead = index >= 0 ? index : 0;
        const waitMinutes = peopleAhead * 10;

        res.json({
            patient_name: patient.full_name,
            patient_id: patient.patient_id,
            status: q.status,
            queue_position: index >= 0 ? index + 1 : 0,
            people_ahead: peopleAhead,
            estimated_wait_minutes: waitMinutes
        });
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/camps/:campId/patients/:patientId/report/download — download latest report
router.get('/:campId/patients/:patientId/report/download',
    authenticate,
    async (req, res) => {
        try {
            // Patient can only access own reports
            if (req.patientId && req.patientId !== req.params.patientId) {
                return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
            }

            const report = await Report.findOne({
                where: {
                    patient_id: req.params.patientId,
                    camp_id: req.params.campId,
                    status: 'completed'
                },
                order: [['createdAt', 'DESC']],
            });

            if (!report) {
                return res.status(404).json({ error: 'Report not found or not ready', code: 'NOT_FOUND' });
            }

            // Auto-regenerate if PDF file is missing
            const fs = require('fs');
            if (!report.pdf_path || !fs.existsSync(report.pdf_path)) {
                // Try to regenerate
                try {
                    const { generatePDF } = require('../services/pdfService');
                    const Screening = require('../models/Screening');
                    const User = require('../models/User');
                    const Camp = require('../models/Camp');
                    const Patient = require('../models/Patient');

                    const screening = await Screening.findByPk(report.screening_id);
                    const patient = await Patient.findByPk(report.patient_id);
                    const camp = await Camp.findByPk(report.camp_id);
                    const dentist = screening ? await User.findByPk(screening.dentist_id) : null;

                    if (screening && patient && camp && dentist) {
                        await report.update({ status: 'generating' });
                        const newVersion = (report.version || 1) + 1;
                        const pdfPath = await generatePDF({
                            patient, screening, camp, dentist,
                            reportId: report.id,
                            version: newVersion,
                        });
                        await report.update({
                            pdf_path: pdfPath,
                            version: newVersion,
                            status: 'completed',
                            generated_at: new Date(),
                            error_log: null,
                        });
                        report.pdf_path = pdfPath;
                    }
                } catch (regenErr) {
                    console.error('PDF regeneration failed:', regenErr);
                }

                if (!report.pdf_path || !fs.existsSync(report.pdf_path)) {
                    return res.status(503).json({ error: 'PDF temporarily unavailable. Please try again in a moment.', code: 'PDF_UNAVAILABLE' });
                }
            }

            await createAuditEntry({
                userId: req.userId || null,
                action: 'patient_report.download',
                targetType: 'Report',
                targetId: report.id,
                metadata: { patientId: req.patientId || null },
                ipAddress: req.ip,
            });

            const pathModule = require('path');
            const fileName = pathModule.basename(report.pdf_path);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', 'application/pdf');
            res.download(report.pdf_path, fileName);
        } catch (error) {
            console.error('Download report error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/camps/:campId/patients/:patientId/reports — list reports for a patient
router.get('/:campId/patients/:patientId/reports',
    authenticate,
    async (req, res) => {
        try {
            if (req.patientId && req.patientId !== req.params.patientId) {
                return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
            }

            const reports = await Report.findAll({
                where: {
                    patient_id: req.params.patientId,
                    camp_id: req.params.campId,
                    status: 'completed',
                },
                include: [
                    {
                        model: Screening,
                        as: 'screening',
                        attributes: ['oral_hygiene', 'caries', 'gingivitis', 'malocclusion', 'treatments', 'createdAt'],
                    },
                ],
                order: [['generated_at', 'DESC']],
            });

            res.json({ reports });
        } catch (error) {
            console.error('List patient reports error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

module.exports = router;
