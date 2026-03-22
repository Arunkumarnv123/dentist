const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Screening = sequelize.define('Screening', {
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
    dentist_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    oral_hygiene: {
        type: DataTypes.ENUM('good', 'fair', 'poor'),
        allowNull: true,
    },
    caries: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    gingivitis: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    malocclusion: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
    },
    other_findings: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: { len: [0, 500] },
    },
    treatments: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON array of treatment recommendations',
        get() {
            const val = this.getDataValue('treatments');
            return val ? JSON.parse(val) : [];
        },
        set(val) {
            this.setDataValue('treatments', JSON.stringify(val || []));
        },
    },
    draft: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'Optimistic locking version',
    },
    idempotency_key: {
        type: DataTypes.STRING,
        allowNull: true,
    },
});

module.exports = Screening;
