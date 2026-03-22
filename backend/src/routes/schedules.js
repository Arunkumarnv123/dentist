const express = require('express');
const { body } = require('express-validator');
const { DoctorSchedule, User, Camp } = require('../models');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { Op } = require('sequelize');

const router = express.Router();

// POST /api/schedules — create doctor availability
router.post('/',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin'),
    [
        body('doctor_id').notEmpty(),
        body('camp_id').notEmpty(),
        body('date').notEmpty().isDate(),
        body('start_time').notEmpty().matches(/^\d{2}:\d{2}$/),
        body('end_time').notEmpty().matches(/^\d{2}:\d{2}$/),
        body('slot_duration_minutes').optional().isInt({ min: 5, max: 60 }),
    ],
    validate,
    async (req, res) => {
        try {
            const { doctor_id, camp_id, date, start_time, end_time, slot_duration_minutes } = req.body;

            const schedule = await DoctorSchedule.create({
                doctor_id, camp_id, date,
                start_time, end_time,
                slot_duration_minutes: slot_duration_minutes || 10,
                is_available: true,
            });

            res.status(201).json({ schedule });
        } catch (error) {
            console.error('Schedule create error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/schedules/:campId — list schedules for a camp
router.get('/:campId',
    authenticate,
    async (req, res) => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const schedules = await DoctorSchedule.findAll({
                where: {
                    camp_id: req.params.campId,
                    date: { [Op.gte]: today },
                },
                include: [
                    { model: User, as: 'doctor', attributes: ['id', 'name', 'email'] },
                ],
                order: [['date', 'ASC'], ['start_time', 'ASC']],
            });

            res.json({ schedules });
        } catch (error) {
            console.error('Schedule list error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// DELETE /api/schedules/:id — remove a schedule
router.delete('/:id',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin'),
    async (req, res) => {
        try {
            const schedule = await DoctorSchedule.findByPk(req.params.id);
            if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

            await schedule.update({ is_available: false });
            res.json({ message: 'Schedule disabled' });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

module.exports = router;
