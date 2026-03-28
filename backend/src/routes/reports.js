const express = require('express');
const path = require('path');
const fs = require('fs');
const { Report, Patient, Screening, Camp, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { createAuditEntry } = require('../middleware/auditLogger');
const { generatePDF } = require('../services/pdfService');

const router = express.Router();

/**
 * Helper: regenerate PDF on-demand if file is missing but report exists.
 * This fixes the "Report not available" issue after files are cleaned up.
 */
async function ensurePDFExists(report) {
    if (report.pdf_path && fs.existsSync(report.pdf_path)) {
        return report; // File exists, nothing to do
    }

    if (report.status !== 'completed' && report.status !== 'failed') {
        return report; // Not ready to regenerate
    }

    try {
        const screening = await Screening.findByPk(report.screening_id);
        const patient = await Patient.findByPk(report.patient_id);
        const camp = await Camp.findByPk(report.camp_id);
        const dentist = screening ? await User.findByPk(screening.dentist_id) : null;

        if (!screening || !patient || !camp || !dentist) {
            return report; // Missing data, cannot regenerate
        }

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

        // Reload report with updated data
        return await Report.findByPk(report.id);
    } catch (error) {
        console.error('Auto-regeneration failed:', error);
        await report.update({ status: 'failed', error_log: error.message });
        return report;
    }
}

// GET /api/reports/:reportId — get report metadata
router.get('/:reportId',
    authenticate,
    async (req, res) => {
        try {
            const report = await Report.findByPk(req.params.reportId, {
                include: [
                    { model: Patient, as: 'patient', attributes: ['patient_id', 'full_name', 'phone'] },
                    { model: Screening, as: 'screening' },
                ],
            });

            if (!report) {
                return res.status(404).json({ error: 'Report not found', code: 'NOT_FOUND' });
            }

            // Patient can only access their own reports
            if (req.patientId && report.patient_id !== req.patientId) {
                return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
            }

            res.json({ report });
        } catch (error) {
            console.error('Get report error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/reports/:reportId/download — download PDF (auto-regenerates if missing)
router.get('/:reportId/download',
    authenticate,
    async (req, res) => {
        try {
            let report = await Report.findByPk(req.params.reportId);

            if (!report) {
                return res.status(404).json({ error: 'Report not found', code: 'NOT_FOUND' });
            }

            // Patient can only access their own reports
            if (req.patientId && report.patient_id !== req.patientId) {
                return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
            }

            if (report.status !== 'completed') {
                return res.status(400).json({ error: 'Report not ready for download', code: 'REPORT_NOT_READY' });
            }

            // Auto-regenerate if PDF file is missing
            report = await ensurePDFExists(report);

            if (!report.pdf_path || !fs.existsSync(report.pdf_path)) {
                return res.status(503).json({ error: 'PDF could not be generated. Please try again later.', code: 'PDF_UNAVAILABLE' });
            }

            await createAuditEntry({
                userId: req.userId || null,
                action: 'report.download',
                targetType: 'Report',
                targetId: report.id,
                metadata: { patientId: req.patientId || null },
                ipAddress: req.ip,
            });

            const fileName = path.basename(report.pdf_path);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', 'application/pdf');
            res.download(report.pdf_path, fileName);
        } catch (error) {
            console.error('Download report error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// POST /api/reports/:reportId/regenerate — force regenerate PDF
router.post('/:reportId/regenerate',
    authenticate,
    async (req, res) => {
        try {
            // Only staff can force-regenerate
            if (req.patientId) {
                return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
            }

            const report = await Report.findByPk(req.params.reportId);
            if (!report) {
                return res.status(404).json({ error: 'Report not found', code: 'NOT_FOUND' });
            }

            const screening = await Screening.findByPk(report.screening_id);
            const patient = await Patient.findByPk(report.patient_id);
            const dentist = await User.findByPk(screening.dentist_id);
            const camp = await Camp.findByPk(report.camp_id);

            await report.update({ status: 'generating' });

            try {
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

                res.json({ report, message: 'Report regenerated successfully' });
            } catch (pdfError) {
                await report.update({
                    status: 'failed',
                    error_log: pdfError.message,
                    retry_count: (report.retry_count || 0) + 1,
                });
                res.status(500).json({ error: 'PDF regeneration failed', code: 'PDF_GENERATION_FAILED' });
            }
        } catch (error) {
            console.error('Regenerate report error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/reports/patient/:patientId — get all reports for a patient (patient self-service)
router.get('/patient/:patientId',
    authenticate,
    async (req, res) => {
        try {
            const { patientId } = req.params;

            // Patient can only access own reports
            if (req.patientId && req.patientId !== patientId) {
                return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
            }

            const reports = await Report.findAll({
                where: { patient_id: patientId, status: 'completed' },
                include: [
                    { model: Patient, as: 'patient', attributes: ['patient_id', 'full_name', 'phone'] },
                    { model: Camp, as: 'camp', attributes: ['name', 'location'] },
                    {
                        model: Screening, as: 'screening',
                        attributes: ['oral_hygiene', 'caries', 'gingivitis', 'malocclusion', 'treatments', 'createdAt'],
                    },
                ],
                order: [['generated_at', 'DESC']],
            });

            res.json({ reports });
        } catch (error) {
            console.error('Get patient reports error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

module.exports = router;
