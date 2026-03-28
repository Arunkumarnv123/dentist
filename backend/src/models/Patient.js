const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Patient = sequelize.define('Patient', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    patient_id: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Human-readable ID like SC-0001',
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
        allowNull: true, // not null enforced at app layer to avoid ALTER issues
        validate: {
            is: /^[0-9]{10}$/,
        },
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail(value) {
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    throw new Error('Invalid email format');
                }
            },
        },
    },
    passkey: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Hashed passkey for patient self-service login',
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
}, {
    hooks: {
        beforeCreate: async (patient) => {
            if (patient.passkey) {
                patient.passkey = await bcrypt.hash(patient.passkey, 10);
            }
        },
        beforeUpdate: async (patient) => {
            if (patient.changed('passkey') && patient.passkey) {
                patient.passkey = await bcrypt.hash(patient.passkey, 10);
            }
        },
    },
});

Patient.prototype.validatePasskey = async function (passkey) {
    if (!this.passkey) return false;
    return bcrypt.compare(passkey, this.passkey);
};

module.exports = Patient;
