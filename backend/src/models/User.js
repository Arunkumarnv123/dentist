const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
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
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    role: {
        type: DataTypes.ENUM('dentist', 'camp_admin', 'system_admin', 'auditor', 'patient'),
        allowNull: false,
        defaultValue: 'dentist',
    },
    camp_ids: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON array of camp IDs user has access to',
        get() {
            const val = this.getDataValue('camp_ids');
            return val ? JSON.parse(val) : [];
        },
        set(val) {
            this.setDataValue('camp_ids', JSON.stringify(val || []));
        },
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
    },
});

User.prototype.validatePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

User.prototype.toSafeJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
};

module.exports = User;
