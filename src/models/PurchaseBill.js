const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const PurchaseBill = sequelize.define('PurchaseBill', {
    purchase_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        unique: true
    },
    customer_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    purchase_date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    loan_reference: {
        type: DataTypes.STRING,
        allowNull: true
    },
    seal: {
        type: DataTypes.STRING,
        allowNull: false
    },
    grade: {
        type: DataTypes.STRING,
        allowNull: false
    },
    material_list: {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: false
    },
    material_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Gold'
    },
    weight_in_grams: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    value_per_gram: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    total_purchase_amt: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    secure_location: {
        type: DataTypes.ENUM('Bank', 'Personal'),
        allowNull: false
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    status: {
        type: DataTypes.ENUM('In Stock', 'Sold'),
        defaultValue: 'In Stock'
    },
    sales_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    sold_to: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sales_amount: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    profit: {
        type: DataTypes.FLOAT,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = PurchaseBill;