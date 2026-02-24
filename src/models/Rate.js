const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Rate = sequelize.define('Rate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    gold_rate_per_gram: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0
    },

    silver_rate_per_gram: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0
    }
}, {
    timestamps: true
});

module.exports = Rate;