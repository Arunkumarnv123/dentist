const express = require('express');
const { body } = require('express-validator');
const { Screening, Patient, QueueEntry, Report, User, Camp } = require('../models');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createAuditEntry } = require('../middleware/auditLogger');
const { generatePDF } = require('../services/pdfService');

const router = express.Router();

// POST /api/camps/:campId/screenings — create or save draft screening
router.post('/:campId/screenings',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin'),
    [
        body('patient_id').notEmpty().withMessage('Patient ID required'),
        body('oral_hygiene').optional().isIn(['good', 'fair', 'poor']),
        body('caries').optional().isBoolean(),
        body('gingivitis').optional().isBoolean(),
        body('malocclusion').optional().isBoolean(),
        body('other_findings').optional().isLength({ max: 500 }),
        body('treatments').optional().isArray(),
    ],
    validate,
    async (req, res) => {
        try {
            const campId = req.params.campId;
            const {
                patient_id, oral_hygiene, caries, gingivitis, malocclusion,
                other_findings, treatments, idempotency_key,
            } = req.body;

            // Verify patient exists in this camp
            const patient = await Patient.findOne({ where: { id: patient_id, camp_id: campId } });
            if (!patient) {
                return res.status(404).json({ error: 'Patient not found in this camp', code: 'NOT_FOUND' });
            }

            // Check for existing draft screening for this patient by this dentist
            let screening = await Screening.findOne({
                where: { patient_id, camp_id: campId, dentist_id: req.userId, draft: true },
            });

            if (screening) {
                // Update existing draft
                await screening.update({
                    oral_hygiene: oral_hygiene !== undefined ? oral_hygiene : screening.oral_hygiene,
                    caries: caries !== undefined ? caries : screening.caries,
                    gingivitis: gingivitis !== undefined ? gingivitis : screening.gingivitis,
                    malocclusion: malocclusion !== undefined ? malocclusion : screening.malocclusion,
                    other_findings: other_findings !== undefined ? other_findings : screening.other_findings,
                    treatments: treatments !== undefined ? treatments : screening.treatments,
                });
            } else {
                // Create new draft screening
                screening = await Screening.create({
                    patient_id,
                    camp_id: campId,
                    dentist_id: req.userId,
                    oral_hygiene: oral_hygiene || null,
                    caries: caries || null,
                    gingivitis: gingivitis || null,
                    malocclusion: malocclusion || null,
                    other_findings: other_findings || null,
                    treatments: treatments || [],
                    draft: true,
                    idempotency_key: idempotency_key || null,
                });
            }

            await createAuditEntry({
                userId: req.userId,
                action: 'screening.save_draft',
                targetType: 'Screening',
                targetId: screening.id,
                metadata: { patient_id, camp_id: campId },
                ipAddress: req.ip,
            });

            res.json({ screening, message: 'Draft saved' });
        } catch (error) {
            console.error('Save screening error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// PUT /api/camps/:campId/screenings/:screeningId/submit — finalize screening
router.put('/:campId/screenings/:screeningId/submit',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin'),
    async (req, res) => {
        try {
            const { campId, screeningId } = req.params;

            const screening = await Screening.findOne({
                where: { id: screeningId, camp_id: campId },
            });

            if (!screening) {
                return res.status(404).json({ error: 'Screening not found', code: 'NOT_FOUND' });
            }

            // Validation: oral_hygiene is required for final submit
            if (!screening.oral_hygiene) {
                return res.status(400).json({
                    error: 'Oral Hygiene must be selected before submitting',
                    code: 'VALIDATION_ERROR',
                });
            }

            // If caries = true, should have at least one treatment or explicit acknowledgment
            if (screening.caries === true) {
                const treatments = screening.treatments || [];
                if (treatments.length === 0) {
                    // Allow submit but add "No immediate treatment" automatically
                    await screening.update({ treatments: ['No immediate treatment'] });
                }
            }

            // Finalize screening
            await screening.update({
                draft: false,
                version: screening.version + 1,
            });

            // Update queue status to screened
            await QueueEntry.update(
                { status: 'screened', locked_by: null, lock_expires_at: null },
                { where: { patient_id: screening.patient_id, camp_id: campId } }
            );

            // Generate PDF report asynchronously
            let report = null;
            try {
                const patient = await Patient.findByPk(screening.patient_id);
                const dentist = await User.findByPk(screening.dentist_id);
                const camp = await Camp.findByPk(campId);

                report = await Report.create({
                    screening_id: screening.id,
                    patient_id: screening.patient_id,
                    camp_id: campId,
                    version: screening.version,
                    status: 'generating',
                });

                // Generate PDF
                const pdfPath = await generatePDF({
                    patient,
                    screening,
                    camp,
                    dentist,
                    reportId: report.id,
                    version: screening.version,
                });

                await report.update({
                    pdf_path: pdfPath,
                    status: 'completed',
                    generated_at: new Date(),
                });
            } catch (pdfError) {
                console.error('PDF generation error:', pdfError);
                if (report) {
                    await report.update({
                        status: 'failed',
                        error_log: pdfError.message,
                        retry_count: report.retry_count + 1,
                    });
                }
            }

            await createAuditEntry({
                userId: req.userId,
                action: 'screening.submit',
                targetType: 'Screening',
                targetId: screening.id,
                metadata: {
                    patient_id: screening.patient_id,
                    camp_id: campId,
                    report_id: report ? report.id : null,
                },
                ipAddress: req.ip,
            });

            res.json({
                screening,
                report,
                message: 'Screening submitted and report generated',
            });
        } catch (error) {
            console.error('Submit screening error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/camps/:campId/screenings/:screeningId — get screening
router.get('/:campId/screenings/:screeningId',
    authenticate,
    async (req, res) => {
        try {
            const screening = await Screening.findOne({
                where: { id: req.params.screeningId, camp_id: req.params.campId },
                include: [
                    { model: Patient, as: 'patient' },
                    { model: User, as: 'dentist', attributes: ['id', 'name', 'email'] },
                    { model: Report, as: 'reports', order: [['version', 'DESC']] },
                ],
            });

            if (!screening) {
                return res.status(404).json({ error: 'Screening not found', code: 'NOT_FOUND' });
            }

            res.json({ screening });
        } catch (error) {
            console.error('Get screening error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

module.exports = router;
