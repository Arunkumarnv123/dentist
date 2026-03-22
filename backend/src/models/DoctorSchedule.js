const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DoctorSchedule = sequelize.define('DoctorSchedule', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    doctor_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    camp_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    date: {
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
    slot_duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
    },
    is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
});

module.exports = DoctorSchedule;
