const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Customer = sequelize.define('Customer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    relation_type: {
        type: DataTypes.ENUM('S/O', 'W/O', 'C/O'),
        allowNull: false
    },
    relative_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    street: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    area: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    state: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    pincode: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    total_closed_loan_amt: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0
    },
    open_loan_cnt: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    closed_loan_cnt: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    total_loan_cnt: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    item_photo_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "path of the item image"
    },
}, {
    timestamps: true
});

module.exports = Customer;