const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Appointment = sequelize.define('Appointment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    doctor_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    camp_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    appointment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    start_time: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'HH:mm format',
    },
    end_time: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'HH:mm format',
    },
    token_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Auto-incremented per camp per day',
    },
    status: {
        type: DataTypes.ENUM('booked', 'in_progress', 'completed', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'booked',
    },
    type: {
        type: DataTypes.ENUM('scheduled', 'walk_in'),
        allowNull: false,
        defaultValue: 'scheduled',
    },
    estimated_start_time: {
        type: DataTypes.STRING(5),
        allowNull: true,
        comment: 'Calculated estimated start HH:mm',
    },
    actual_start_time: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    actual_end_time: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    extended_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Extra minutes added by doctor',
    },
    cancel_reason: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    booked_by_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'The User account that booked this appointment',
    },
});

module.exports = Appointment;
