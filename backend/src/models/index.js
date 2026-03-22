const sequelize = require('../config/database');
const Camp = require('./Camp');
const Patient = require('./Patient');
const QueueEntry = require('./QueueEntry');
const Screening = require('./Screening');
const Report = require('./Report');
const User = require('./User');
const AuditLog = require('./AuditLog');
const DoctorSchedule = require('./DoctorSchedule');
const Appointment = require('./Appointment');

// ── Associations ──

// Camp → Patients
Camp.hasMany(Patient, { foreignKey: 'camp_id', as: 'patients' });
Patient.belongsTo(Camp, { foreignKey: 'camp_id', as: 'camp' });

// Camp → QueueEntries
Camp.hasMany(QueueEntry, { foreignKey: 'camp_id', as: 'queueEntries' });
QueueEntry.belongsTo(Camp, { foreignKey: 'camp_id', as: 'camp' });

// Patient → QueueEntry (1:1)
Patient.hasOne(QueueEntry, { foreignKey: 'patient_id', as: 'queueEntry' });
QueueEntry.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Patient → Screenings
Patient.hasMany(Screening, { foreignKey: 'patient_id', as: 'screenings' });
Screening.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Camp → Screenings
Camp.hasMany(Screening, { foreignKey: 'camp_id', as: 'screenings' });
Screening.belongsTo(Camp, { foreignKey: 'camp_id', as: 'camp' });

// User (Dentist) → Screenings
User.hasMany(Screening, { foreignKey: 'dentist_id', as: 'screenings' });
Screening.belongsTo(User, { foreignKey: 'dentist_id', as: 'dentist' });

// Screening → Reports
Screening.hasMany(Report, { foreignKey: 'screening_id', as: 'reports' });
Report.belongsTo(Screening, { foreignKey: 'screening_id', as: 'screening' });

// Patient → Reports
Patient.hasMany(Report, { foreignKey: 'patient_id', as: 'reports' });
Report.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// User → QueueEntry (lock)
User.hasMany(QueueEntry, { foreignKey: 'locked_by', as: 'lockedEntries' });
QueueEntry.belongsTo(User, { foreignKey: 'locked_by', as: 'lockedByUser' });

// ── Doctor Schedule Associations ──
User.hasMany(DoctorSchedule, { foreignKey: 'doctor_id', as: 'schedules' });
DoctorSchedule.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });
Camp.hasMany(DoctorSchedule, { foreignKey: 'camp_id', as: 'schedules' });
DoctorSchedule.belongsTo(Camp, { foreignKey: 'camp_id', as: 'camp' });

// ── Appointment Associations ──
Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
User.hasMany(Appointment, { foreignKey: 'doctor_id', as: 'doctorAppointments' });
Appointment.belongsTo(User, { foreignKey: 'doctor_id', as: 'doctor' });
Camp.hasMany(Appointment, { foreignKey: 'camp_id', as: 'appointments' });
Appointment.belongsTo(Camp, { foreignKey: 'camp_id', as: 'camp' });
User.hasMany(Appointment, { foreignKey: 'booked_by_user_id', as: 'bookedAppointments' });
Appointment.belongsTo(User, { foreignKey: 'booked_by_user_id', as: 'bookedBy' });

module.exports = {
    sequelize,
    Camp,
    Patient,
    QueueEntry,
    Screening,
    Report,
    User,
    AuditLog,
    DoctorSchedule,
    Appointment,
};
