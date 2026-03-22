const express = require('express');
const { body, param, query } = require('express-validator');
const { Appointment, Patient, User, Camp, DoctorSchedule } = require('../models');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { Op } = require('sequelize');

const router = express.Router();

// ── Helper: get next token number for a camp+date ──
async function getNextToken(campId, date) {
    const max = await Appointment.max('token_number', {
        where: { camp_id: campId, appointment_date: date },
    });
    return (max || 0) + 1;
}

// ── Helper: add minutes to HH:mm string ──
function addMinutes(time, mins) {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// ── Helper: calculate estimated wait ──
async function calculateEstimate(campId, date, doctorId, tokenNumber) {
    const aheadAppointments = await Appointment.findAll({
        where: {
            camp_id: campId,
            appointment_date: date,
            doctor_id: doctorId,
            token_number: { [Op.lt]: tokenNumber },
            status: { [Op.in]: ['booked', 'in_progress'] },
        },
        order: [['token_number', 'ASC']],
    });

    let waitMinutes = 0;
    for (const apt of aheadAppointments) {
        waitMinutes += 10 + (apt.extended_minutes || 0);
    }
    return waitMinutes;
}

// ─────────────────────────────────────────────
// GET /api/appointments/doctors/:campId — available doctors + schedules
// ─────────────────────────────────────────────
router.get('/doctors/:campId',
    async (req, res) => {
        try {
            const campId = req.params.campId;
            const today = new Date().toISOString().slice(0, 10);

            const schedules = await DoctorSchedule.findAll({
                where: {
                    camp_id: campId,
                    date: { [Op.gte]: today },
                    is_available: true,
                },
                include: [{ model: User, as: 'doctor', attributes: ['id', 'name', 'email', 'phone'] }],
                order: [['date', 'ASC'], ['start_time', 'ASC']],
            });

            // Group by doctor and generate available slots
            const doctorMap = {};
            for (const sch of schedules) {
                const dId = sch.doctor_id;
                if (!doctorMap[dId]) {
                    doctorMap[dId] = {
                        doctor: sch.doctor.toSafeJSON(),
                        dates: {},
                    };
                }

                const dateKey = sch.date;
                if (!doctorMap[dId].dates[dateKey]) {
                    doctorMap[dId].dates[dateKey] = [];
                }

                // Generate time slots
                let current = sch.start_time;
                while (current < sch.end_time) {
                    const slotEnd = addMinutes(current, sch.slot_duration_minutes);
                    if (slotEnd <= sch.end_time) {
                        doctorMap[dId].dates[dateKey].push({
                            start: current,
                            end: slotEnd,
                            schedule_id: sch.id,
                        });
                    }
                    current = slotEnd;
                }
            }

            // Mark already-booked slots
            const allAppointments = await Appointment.findAll({
                where: {
                    camp_id: campId,
                    appointment_date: { [Op.gte]: today },
                    status: { [Op.in]: ['booked', 'in_progress'] },
                },
                attributes: ['doctor_id', 'appointment_date', 'start_time'],
            });

            const bookedSet = new Set(
                allAppointments.map(a => `${a.doctor_id}_${a.appointment_date}_${a.start_time}`)
            );

            for (const dId of Object.keys(doctorMap)) {
                for (const dateKey of Object.keys(doctorMap[dId].dates)) {
                    doctorMap[dId].dates[dateKey] = doctorMap[dId].dates[dateKey].map(slot => ({
                        ...slot,
                        booked: bookedSet.has(`${dId}_${dateKey}_${slot.start}`),
                    }));
                }
            }

            res.json({ doctors: Object.values(doctorMap) });
        } catch (error) {
            console.error('Availability error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─────────────────────────────────────────────
// POST /api/appointments/book — book a scheduled appointment
// ─────────────────────────────────────────────
router.post('/book',
    authenticate,
    [
        body('camp_id').notEmpty(),
        body('doctor_id').notEmpty(),
        body('patient_id').notEmpty(),
        body('appointment_date').notEmpty().isDate(),
        body('start_time').notEmpty().matches(/^\d{2}:\d{2}$/),
    ],
    validate,
    async (req, res) => {
        try {
            const { camp_id, doctor_id, patient_id, appointment_date, start_time } = req.body;

            // Check if slot is still available
            const existing = await Appointment.findOne({
                where: {
                    camp_id, doctor_id, appointment_date, start_time,
                    status: { [Op.in]: ['booked', 'in_progress'] },
                },
            });
            if (existing) {
                return res.status(409).json({ error: 'Slot is already booked', code: 'SLOT_TAKEN' });
            }

            const token = await getNextToken(camp_id, appointment_date);
            const end_time = addMinutes(start_time, 10);
            const waitMins = await calculateEstimate(camp_id, appointment_date, doctor_id, token);
            const estimated_start = addMinutes(start_time, 0); // for scheduled, it's the slot time

            const appointment = await Appointment.create({
                patient_id, doctor_id, camp_id,
                appointment_date, start_time, end_time,
                token_number: token,
                status: 'booked',
                type: 'scheduled',
                estimated_start_time: estimated_start,
                booked_by_user_id: req.userId,
            });

            res.status(201).json({
                appointment,
                token_number: token,
                estimated_wait_minutes: waitMins,
            });
        } catch (error) {
            console.error('Book error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─────────────────────────────────────────────
// POST /api/appointments/walk-in — get a walk-in token
// ─────────────────────────────────────────────
router.post('/walk-in',
    authenticate,
    [
        body('camp_id').notEmpty(),
        body('doctor_id').notEmpty(),
        body('patient_id').notEmpty(),
    ],
    validate,
    async (req, res) => {
        try {
            const { camp_id, doctor_id, patient_id } = req.body;
            const today = new Date().toISOString().slice(0, 10);
            const token = await getNextToken(camp_id, today);

            // Estimate: end of current queue
            const waitMins = await calculateEstimate(camp_id, today, doctor_id, token);
            const now = new Date();
            const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const estimatedStart = addMinutes(nowTime, waitMins);

            const appointment = await Appointment.create({
                patient_id, doctor_id, camp_id,
                appointment_date: today,
                start_time: estimatedStart,
                end_time: addMinutes(estimatedStart, 10),
                token_number: token,
                status: 'booked',
                type: 'walk_in',
                estimated_start_time: estimatedStart,
                booked_by_user_id: req.userId,
            });

            res.status(201).json({
                appointment,
                token_number: token,
                estimated_wait_minutes: waitMins,
                estimated_start_time: estimatedStart,
            });
        } catch (error) {
            console.error('Walk-in error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─────────────────────────────────────────────
// GET /api/appointments/my — patient's own appointments
// ─────────────────────────────────────────────
router.get('/my',
    authenticate,
    async (req, res) => {
        try {
            const appointments = await Appointment.findAll({
                where: { booked_by_user_id: req.userId },
                include: [
                    { model: User, as: 'doctor', attributes: ['id', 'name', 'email'] },
                    { model: Camp, as: 'camp', attributes: ['id', 'name', 'prefix', 'location'] },
                    { model: Patient, as: 'patient', attributes: ['id', 'patient_id', 'full_name'] },
                ],
                order: [['appointment_date', 'DESC'], ['start_time', 'ASC']],
            });

            // Recalculate live wait estimates for active appointments
            const enriched = [];
            for (const apt of appointments) {
                const a = apt.toJSON();
                if (['booked', 'in_progress'].includes(a.status)) {
                    a.estimated_wait_minutes = await calculateEstimate(
                        a.camp_id, a.appointment_date, a.doctor_id, a.token_number
                    );
                    const now = new Date();
                    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    a.estimated_start_time_live = addMinutes(nowTime, a.estimated_wait_minutes);
                }
                enriched.push(a);
            }

            res.json({ appointments: enriched });
        } catch (error) {
            console.error('My appointments error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─────────────────────────────────────────────
// DELETE /api/appointments/:id/cancel — cancel if ≥ 1hr before
// ─────────────────────────────────────────────
router.delete('/:id/cancel',
    authenticate,
    async (req, res) => {
        try {
            const appointment = await Appointment.findByPk(req.params.id);
            if (!appointment) {
                return res.status(404).json({ error: 'Appointment not found' });
            }
            if (appointment.booked_by_user_id !== req.userId) {
                return res.status(403).json({ error: 'Not your appointment' });
            }
            if (appointment.status !== 'booked') {
                return res.status(400).json({ error: 'Cannot cancel — appointment is ' + appointment.status });
            }

            // Check 1-hour rule
            const aptDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}:00`);
            const now = new Date();
            const diffMs = aptDateTime - now;
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours < 1) {
                return res.status(400).json({
                    error: 'Cannot cancel within 1 hour of appointment time',
                    code: 'CANCEL_TOO_LATE',
                    minutes_until_appointment: Math.round(diffMs / 60000),
                });
            }

            await appointment.update({
                status: 'cancelled',
                cancel_reason: req.body.reason || 'Cancelled by patient',
            });

            res.json({ message: 'Appointment cancelled', appointment });
        } catch (error) {
            console.error('Cancel error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─────────────────────────────────────────────
// GET /api/appointments/live/:campId — live queue status (public-ish)
// ─────────────────────────────────────────────
router.get('/live/:campId',
    async (req, res) => {
        try {
            const campId = req.params.campId;
            const today = new Date().toISOString().slice(0, 10);

            // Current being served
            const inProgress = await Appointment.findAll({
                where: { camp_id: campId, appointment_date: today, status: 'in_progress' },
                include: [
                    { model: User, as: 'doctor', attributes: ['id', 'name'] },
                ],
                order: [['token_number', 'ASC']],
            });

            // Upcoming queue
            const upcoming = await Appointment.findAll({
                where: { camp_id: campId, appointment_date: today, status: 'booked' },
                include: [
                    { model: User, as: 'doctor', attributes: ['id', 'name'] },
                ],
                order: [['token_number', 'ASC']],
            });

            // Completed count
            const completedCount = await Appointment.count({
                where: { camp_id: campId, appointment_date: today, status: 'completed' },
            });

            const totalCount = await Appointment.count({
                where: {
                    camp_id: campId,
                    appointment_date: today,
                    status: { [Op.in]: ['booked', 'in_progress', 'completed'] },
                },
            });

            res.json({
                currently_serving: inProgress.map(a => ({
                    token_number: a.token_number,
                    doctor_name: a.doctor?.name,
                    extended_minutes: a.extended_minutes,
                })),
                upcoming_count: upcoming.length,
                upcoming_tokens: upcoming.slice(0, 20).map(a => ({
                    token_number: a.token_number,
                    estimated_start_time: a.estimated_start_time,
                    doctor_name: a.doctor?.name,
                })),
                completed_count: completedCount,
                total_count: totalCount,
                avg_minutes_per_patient: 10,
            });
        } catch (error) {
            console.error('Live queue error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─────────────────────────────────────────────
// PUT /api/appointments/:id/start — doctor starts seeing patient
// ─────────────────────────────────────────────
router.put('/:id/start',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin'),
    async (req, res) => {
        try {
            const appointment = await Appointment.findByPk(req.params.id);
            if (!appointment) return res.status(404).json({ error: 'Not found' });
            if (appointment.status !== 'booked') {
                return res.status(400).json({ error: 'Appointment is not in booked status' });
            }

            await appointment.update({
                status: 'in_progress',
                actual_start_time: new Date(),
            });

            res.json({ message: 'Appointment started', appointment });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─────────────────────────────────────────────
// PUT /api/appointments/:id/complete — doctor finishes
// ─────────────────────────────────────────────
router.put('/:id/complete',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin'),
    async (req, res) => {
        try {
            const appointment = await Appointment.findByPk(req.params.id);
            if (!appointment) return res.status(404).json({ error: 'Not found' });

            await appointment.update({
                status: 'completed',
                actual_end_time: new Date(),
            });

            res.json({ message: 'Appointment completed', appointment });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// ─────────────────────────────────────────────
// PUT /api/appointments/:id/extend — doctor extends time
// ─────────────────────────────────────────────
router.put('/:id/extend',
    authenticate,
    rbac('dentist', 'camp_admin', 'system_admin'),
    [body('extra_minutes').isInt({ min: 1, max: 60 })],
    validate,
    async (req, res) => {
        try {
            const appointment = await Appointment.findByPk(req.params.id);
            if (!appointment) return res.status(404).json({ error: 'Not found' });
            if (appointment.status !== 'in_progress') {
                return res.status(400).json({ error: 'Can only extend an in-progress appointment' });
            }

            const newExtended = (appointment.extended_minutes || 0) + req.body.extra_minutes;
            await appointment.update({
                extended_minutes: newExtended,
                end_time: addMinutes(appointment.start_time, 10 + newExtended),
            });

            res.json({
                message: `Extended by ${req.body.extra_minutes} minutes`,
                total_extended: newExtended,
                appointment,
            });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

module.exports = router;
