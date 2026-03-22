const express = require('express');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { generateCSVExport, EXPORTS_DIR } = require('../services/exportService');
const { createAuditEntry } = require('../middleware/auditLogger');

const router = express.Router();

// POST /api/exports — generate export
router.post('/',
    authenticate,
    rbac('camp_admin', 'system_admin'),
    async (req, res) => {
        try {
            const { camp_id, format = 'csv' } = req.body;

            if (!camp_id) {
                return res.status(400).json({ error: 'camp_id required', code: 'VALIDATION_ERROR' });
            }

            if (format === 'csv') {
                const result = await generateCSVExport(camp_id);

                await createAuditEntry({
                    userId: req.userId,
                    action: 'export.generate',
                    targetType: 'Camp',
                    targetId: camp_id,
                    metadata: { format, record_count: result.recordCount },
                    ipAddress: req.ip,
                });

                res.json({
                    message: 'Export generated',
                    download_url: `/api/exports/download/${result.fileName}`,
                    record_count: result.recordCount,
                });
            } else {
                res.status(400).json({ error: 'Unsupported format. Use csv.', code: 'VALIDATION_ERROR' });
            }
        } catch (error) {
            console.error('Export error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// GET /api/exports/download/:fileName — download export file
router.get('/download/:fileName',
    authenticate,
    rbac('camp_admin', 'system_admin'),
    async (req, res) => {
        try {
            const filePath = path.join(EXPORTS_DIR, req.params.fileName);
            const fs = require('fs');
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Export file not found', code: 'NOT_FOUND' });
            }
            res.download(filePath, req.params.fileName);
        } catch (error) {
            console.error('Download export error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

module.exports = router;
