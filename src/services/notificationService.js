const { Loan, Trigger, Notification } = require('../models');
const { Op } = require('sequelize');

const refreshNotifications = async () => {
    console.log("Starting Daily Notification Refresh...");

    try {
        const alertConfig = await Trigger.findOne({ where: { type: 'Alert' } });
        const warningConfig = await Trigger.findOne({ where: { type: 'Warning' } });

        const alertDays = alertConfig ? alertConfig.trigger_days : 4;
        const warningDays = warningConfig ? warningConfig.trigger_days : 4;

        await Notification.destroy({ where: {}, truncate: true });

        const loans = await Loan.findAll({ where: { status: 'Open' } });
        const newNotifications = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        loans.forEach(loan => {
            if (!loan.loan_opening_date || !loan.loan_duration_days) return;

            const openDate = new Date(loan.loan_opening_date);
            const dueDate = new Date(openDate);
            dueDate.setDate(openDate.getDate() + loan.loan_duration_days);
            dueDate.setHours(0, 0, 0, 0);

            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Logic: 
            // diffDays = 4  -> Due in 4 days -> Alert
            // diffDays = -4 -> Overdue 4 days -> Warning

            let type = null;
            let config = null;

            if (diffDays === alertDays) {
                type = 'Alert';
                config = alertConfig;
            } else if (diffDays === -warningDays) {
                type = 'Warning';
                config = warningConfig;
            }

            if (type && config) {
                let rawMsg = config.message_format;
                let finalMsg = rawMsg
                    .replace(/{NAME}/g, loan.customer_name)
                    .replace(/{LOAN_ID}/g, loan.loan_id)
                    .replace(/{AMOUNT}/g, loan.total_amount)
                    .replace(/{DATE}/g, dueDate.toLocaleDateString())
                    .replace(/{DAYS}/g, Math.abs(diffDays));

                const encodedMsg = encodeURIComponent(finalMsg);
                const whatsappUrl = `https://wa.me/${loan.phone_no}?text=${encodedMsg}`;

                newNotifications.push({
                    loan_id: loan.loan_id,
                    customer_name: loan.customer_name,
                    phone_no: loan.phone_no,
                    type: type,
                    days_diff: Math.abs(diffDays),
                    message: finalMsg,
                    whatsapp_link: whatsappUrl
                });
            }
        });

        if (newNotifications.length > 0) {
            await Notification.bulkCreate(newNotifications);
        }

        console.log(`Notifications Refreshed: ${newNotifications.length} generated.`);

    } catch (error) {
        console.error("Error refreshing notifications:", error);
    }
};

module.exports = { refreshNotifications };