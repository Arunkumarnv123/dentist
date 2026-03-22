const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Camp = sequelize.define('Camp', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true },
    },
    prefix: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 10] },
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    organization: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('draft', 'active', 'completed', 'cancelled'),
        defaultValue: 'active',
    },
    logo_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    contact_info: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    patient_counter: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
});

module.exports = Camp;
