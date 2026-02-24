const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const BillSettings = sequelize.define('BillSettings', {
    type: {
        type: DataTypes.ENUM('Running', 'Personal'),
        primaryKey: true,
        allowNull: false
    },
    current_series: {
        type: DataTypes.STRING(5),
        allowNull: false
    },
    max_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 10000
    }
}, {
    timestamps: false
});

module.exports = BillSettings;