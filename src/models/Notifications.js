const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Notification = sequelize.define('Notification', {
    loan_id: { type: DataTypes.STRING, allowNull: false },
    customer_name: { type: DataTypes.STRING, allowNull: false },
    phone_no: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('Alert', 'Warning'), allowNull: false },
    days_diff: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    whatsapp_link: { type: DataTypes.TEXT, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = Notification;