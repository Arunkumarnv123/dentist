const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Patient = sequelize.define('Patient', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    patient_id: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Human-readable ID like HF-0001',
    },
    camp_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    full_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true },
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 0, max: 120 },
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    registered_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    idempotency_key: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: 'Client-generated UUID to prevent duplicate submissions',
    },
});

module.exports = Patient;
