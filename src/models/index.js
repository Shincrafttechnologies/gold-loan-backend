const sequelize = require('../utils/database');
const Admin = require('./Admin');
const Loan = require('./Loan');
const Customer = require('./Customer');
const Rate = require('./Rate');
const PurchaseBill = require('./PurchaseBill');
const BillSettings = require('./BillSettings');
const RunningBill = require('./RunningBill');
const Notification = require('./Notifications');
const Trigger = require('./Triggers');
const Material = require('./Materials');

const db = {
    sequelize,
    Admin,
    Loan,
    Customer,
    Rate,
    PurchaseBill,
    BillSettings,
    RunningBill,
    Notification,
    Trigger,
    Material
};

module.exports = db;