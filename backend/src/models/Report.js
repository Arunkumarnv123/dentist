const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Report = sequelize.define('Report', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    screening_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    camp_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    pdf_path: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    status: {
        type: DataTypes.ENUM('pending', 'generating', 'completed', 'failed'),
        defaultValue: 'pending',
    },
    error_log: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    retry_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    generated_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
});

module.exports = Report;
