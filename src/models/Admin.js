const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Admin = sequelize.define('Admin', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },

    reset_token: { type: DataTypes.STRING, allowNull: true },
    reset_token_expiry: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: 'admins',
    timestamps: true
});

module.exports = Admin;