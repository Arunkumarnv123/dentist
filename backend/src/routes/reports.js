const express = require('express');
const path = require('path');
const fs = require('fs');
const { Report, Patient, Screening, Camp } = require('../models');
const { authenticate } = require('../middleware/auth');
const { createAuditEntry } = require('../middleware/auditLogger');
const { generatePDF } = require('../services/pdfService');
const { User } = require('../models');

const router = express.Router();

// GET /api/reports/:reportId — get report metadata
router.get('/:reportId',
    authenticate,
    async (req, res) => {
        try {
            const report = await Report.findByPk(req.params.reportId, {
                include: [
                    { model: Patient, as: 'patient', attributes: ['patient_id', 'full_name'] },
                    { model: Screening, as: 'screening' },
                ],
            });

            if (!report) {
                return res.status(404).json({ error: 'Report not found', code: 'NOT_FOUND' });
            }

            res.json({ report });
        } catch (error) {
            console.error('Get report error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/reports/:reportId/download — download PDF
router.get('/:reportId/download',
    authenticate,
    async (req, res) => {
        try {
            const report = await Report.findByPk(req.params.reportId);

            if (!report) {
                return res.status(404).json({ error: 'Report not found', code: 'NOT_FOUND' });
            }

            if (report.status !== 'completed' || !report.pdf_path) {
                return res.status(400).json({ error: 'Report not ready for download', code: 'REPORT_NOT_READY' });
            }

            if (!fs.existsSync(report.pdf_path)) {
                return res.status(404).json({ error: 'PDF file not found', code: 'FILE_NOT_FOUND' });
            }

            await createAuditEntry({
                userId: req.userId,
                action: 'report.download',
                targetType: 'Report',
                targetId: report.id,
                ipAddress: req.ip,
            });

            const fileName = path.basename(report.pdf_path);
            res.download(report.pdf_path, fileName);
        } catch (error) {
            console.error('Download report error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// POST /api/reports/:reportId/regenerate — regenerate PDF
router.post('/:reportId/regenerate',
    authenticate,
    async (req, res) => {
        try {
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
                const newVersion = report.version + 1;
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
                    retry_count: report.retry_count + 1,
                });
                res.status(500).json({ error: 'PDF regeneration failed', code: 'PDF_GENERATION_FAILED' });
            }
        } catch (error) {
            console.error('Regenerate report error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

module.exports = router;
