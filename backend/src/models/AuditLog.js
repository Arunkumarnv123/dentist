const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'e.g. patient.register, screening.submit, report.download',
    },
    target_type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    target_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const val = this.getDataValue('metadata');
            return val ? JSON.parse(val) : {};
        },
        set(val) {
            this.setDataValue('metadata', JSON.stringify(val || {}));
        },
    },
    ip_address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    updatedAt: false,
    comment: 'Immutable audit log - no updates or deletes',
});

module.exports = AuditLog;
