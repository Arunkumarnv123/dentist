const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QueueEntry = sequelize.define('QueueEntry', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    camp_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'screened', 'skipped'),
        defaultValue: 'pending',
    },
    priority: {
        type: DataTypes.ENUM('normal', 'urgent', 'mobility_issues'),
        defaultValue: 'normal',
    },
    queued_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    locked_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User ID of dentist who locked this entry',
    },
    lock_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
});

module.exports = QueueEntry;
