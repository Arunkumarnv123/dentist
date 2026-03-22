const express = require('express');
const { QueueEntry, Patient, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { createAuditEntry } = require('../middleware/auditLogger');
const { Op } = require('sequelize');

const router = express.Router();

const LOCK_TIMEOUT_MINUTES = 10;

// GET /api/camps/:campId/queue — list queue with pagination and filters
router.get('/:campId/queue',
    authenticate,
    async (req, res) => {
        try {
            const { status, priority, page = 1, limit = 50 } = req.query;
            const campId = req.params.campId;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            const where = { camp_id: campId };
            if (status) where.status = status;
            if (priority) where.priority = priority;

            // Auto-expire stale locks
            await QueueEntry.update(
                { locked_by: null, lock_expires_at: null, status: 'pending' },
                {
                    where: {
                        camp_id: campId,
                        status: 'in_progress',
                        lock_expires_at: { [Op.lt]: new Date() },
                    },
                }
            );

            const { count, rows } = await QueueEntry.findAndCountAll({
                where,
                include: [
                    {
                        model: Patient,
                        as: 'patient',
                        attributes: ['id', 'patient_id', 'full_name', 'age', 'gender', 'phone', 'address', 'city'],
                    },
                    {
                        model: User,
                        as: 'lockedByUser',
                        attributes: ['id', 'name'],
                        required: false,
                    },
                ],
                order: [
                    ['priority', 'ASC'], // urgent first
                    ['queued_at', 'ASC'], // FIFO within priority
                ],
                limit: parseInt(limit),
                offset,
            });

            res.json({
                queue: rows,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / parseInt(limit)),
                },
            });
        } catch (error) {
            console.error('List queue error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// POST /api/camps/:campId/queue/:patientId/lock — lock patient for screening
router.post('/:campId/queue/:patientId/lock',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin'),
    async (req, res) => {
        try {
            const { campId, patientId } = req.params;
            const forceTake = req.body.force === true;

            const queueEntry = await QueueEntry.findOne({
                where: { patient_id: patientId, camp_id: campId },
                include: [
                    { model: User, as: 'lockedByUser', attributes: ['id', 'name'], required: false },
                ],
            });

            if (!queueEntry) {
                return res.status(404).json({ error: 'Queue entry not found', code: 'NOT_FOUND' });
            }

            if (queueEntry.status === 'screened') {
                return res.status(400).json({ error: 'Patient already screened', code: 'ALREADY_SCREENED' });
            }

            // Check if locked by another user
            if (queueEntry.locked_by && queueEntry.locked_by !== req.userId) {
                const lockExpired = queueEntry.lock_expires_at && new Date(queueEntry.lock_expires_at) < new Date();

                if (!lockExpired && !forceTake) {
                    return res.status(423).json({
                        error: 'Patient is locked by another dentist',
                        code: 'LOCKED',
                        locked_by: queueEntry.lockedByUser ? queueEntry.lockedByUser.name : 'Unknown',
                        lock_expires_at: queueEntry.lock_expires_at,
                    });
                }

                // Force take — audit it
                if (forceTake) {
                    await createAuditEntry({
                        userId: req.userId,
                        action: 'queue.force_take',
                        targetType: 'QueueEntry',
                        targetId: queueEntry.id,
                        metadata: {
                            previous_locked_by: queueEntry.locked_by,
                            camp_id: campId,
                        },
                        ipAddress: req.ip,
                    });
                }
            }

            // Set lock
            const lockExpiry = new Date(Date.now() + LOCK_TIMEOUT_MINUTES * 60 * 1000);
            await queueEntry.update({
                locked_by: req.userId,
                lock_expires_at: lockExpiry,
                status: 'in_progress',
            });

            await createAuditEntry({
                userId: req.userId,
                action: 'queue.lock',
                targetType: 'QueueEntry',
                targetId: queueEntry.id,
                metadata: { camp_id: campId, patient_id: patientId },
                ipAddress: req.ip,
            });

            res.json({
                message: 'Patient locked for screening',
                queue_entry: queueEntry,
                lock_expires_at: lockExpiry,
            });
        } catch (error) {
            console.error('Lock error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

// POST /api/camps/:campId/queue/:patientId/unlock — release lock
router.post('/:campId/queue/:patientId/unlock',
    authenticate,
    async (req, res) => {
        try {
            const { campId, patientId } = req.params;

            const queueEntry = await QueueEntry.findOne({
                where: { patient_id: patientId, camp_id: campId },
            });

            if (!queueEntry) {
                return res.status(404).json({ error: 'Queue entry not found', code: 'NOT_FOUND' });
            }

            // Only the lock owner or admins can unlock
            if (queueEntry.locked_by !== req.userId &&
                !['camp_admin', 'system_admin'].includes(req.user.role)) {
                return res.status(403).json({ error: 'Cannot unlock — not the lock owner', code: 'FORBIDDEN' });
            }

            await queueEntry.update({
                locked_by: null,
                lock_expires_at: null,
                status: queueEntry.status === 'in_progress' ? 'pending' : queueEntry.status,
            });

            res.json({ message: 'Lock released', queue_entry: queueEntry });
        } catch (error) {
            console.error('Unlock error:', error);
            res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
);

module.exports = router;
