const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const Loan = sequelize.define('Loan', {
    loan_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        unique: true
    },

    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    customer_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    relation_type: {
        type: DataTypes.ENUM('S/O', 'W/O', 'C/O', 'D/O', 'F/O'),
        allowNull: false
    },
    relative_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone_no: {
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
    material_list: {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: false
    },
    material_type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    total_weight: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    value_per_gram: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    present_value: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    total_amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    interest: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        defaultValue: [],
        allowNull: false
    },
    processing_fee: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    closing_amount: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    profit_amount: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    pending_amount: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    prediction_closing_amount: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    loan_opening_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    loan_closing_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    loan_duration_months: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    loan_total_months: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    loan_total_days: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    loan_duration_days: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    no_of_months: {
        type: DataTypes.VIRTUAL,
        get() {
            const start = new Date(this.loan_opening_date);
            const now = new Date();
            let months = (now.getFullYear() - start.getFullYear()) * 12;
            months -= start.getMonth();
            months += now.getMonth();
            return months <= 0 ? 0 : months;
        }
    },

    partial_payment: {
        type: DataTypes.JSONB,
        defaultValue: []
    },

    bill_type: {
        type: DataTypes.ENUM('Running', 'Personal'),
        allowNull: false
    },
    secure_location: {
        type: DataTypes.ENUM('Locker', 'Bank'),
        allowNull: false
    },
    location_details: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Open', 'Closed'),
        defaultValue: 'Open'
    },
    alert_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    item_photo_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "path of the item image"
    },
}, {
    timestamps: true
});

module.exports = Loan;