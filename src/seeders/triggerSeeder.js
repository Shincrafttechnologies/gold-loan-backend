const { Trigger } = require('../models');

const seedTriggers = async () => {
    try {
        const alertTrigger = await Trigger.findOne({ where: { type: 'Alert' } });
        if (!alertTrigger) {
            await Trigger.create({
                type: 'Alert',
                trigger_days: 4,
                message_format: "Hi {NAME}, gentle reminder that your loan {LOAN_ID} is due in {DAYS} days."
            });
            console.log('Alert Trigger seeded');
        }

        const warningTrigger = await Trigger.findOne({ where: { type: 'Warning' } });
        if (!warningTrigger) {
            await Trigger.create({
                type: 'Warning',
                trigger_days: 4,
                message_format: "Urgent! {NAME}, your loan {LOAN_ID} was due {DAYS} days ago. Please pay immediately."
            });
            console.log('Warning Trigger seeded');
        }
        const newLoanTrigger = await Trigger.findOne({ where: { type: 'NewLoan' } });
        if (!newLoanTrigger) {
            await Trigger.create({
                type: 'NewLoan',
                trigger_days: 0,
                message_format: "New loan has been created in the name {NAME} loan id {LOAN_ID}."
            });
            console.log('NewLoan Trigger seeded');
        }
    } catch (error) {
        console.error('Error seeding Triggers:', error);
    }
};

module.exports = seedTriggers;