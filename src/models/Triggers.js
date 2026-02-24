const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Trigger = sequelize.define('Trigger', {
    type: {
        type: DataTypes.ENUM('Alert', 'Warning', 'NewLoan'),
        primaryKey: true,
        allowNull: false
    },
    trigger_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 4
    },
    message_format: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "Hello {NAME}, your loan {LOAN_ID} of amount {AMOUNT} is due on {DATE}."
    }
}, {
    timestamps: false
});

module.exports = Trigger;