require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const cron = require('node-cron');
const { refreshNotifications } = require('./services/notificationService');
const seedAdmin = require('./seeders/adminSeeder');
const seedBillSettings = require('./seeders/billSettingSeeder');
const seedTriggers = require('./seeders/triggerSeeder');

const PORT = process.env.PORT || 5000;

const start = async () => {
    try {
        await sequelize.sync({ alter: true });
        await seedAdmin();
        await seedBillSettings();
        await seedTriggers();
        cron.schedule('1 0 * * *', () => {
            refreshNotifications();
        });
        await refreshNotifications();
        sequelize.query("ALTER TYPE \"enum_Customers_relation_type\" ADD VALUE 'F/O';").catch(e => console.log("F/O already exists"));
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
        console.error(err);
    }
};

start();
