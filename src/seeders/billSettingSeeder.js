const { BillSettings } = require('../models');

const seedBillSettings = async () => {
    try {
        const runningSettings = await BillSettings.findOne({ where: { type: 'Running' } });
        if (!runningSettings) {
            await BillSettings.create({
                type: 'Running',
                current_series: '0000',
                max_limit: 10000
            });
            console.log('Running Bill Settings seeded (Format: 0000)');
        }

        const personalSettings = await BillSettings.findOne({ where: { type: 'Personal' } });
        if (!personalSettings) {
            await BillSettings.create({
                type: 'Personal',
                current_series: 'N0000',
                max_limit: 10000
            });
            console.log('Personal Bill Settings seeded (Format: N0000)');
        }

    } catch (error) {
        console.error('Error seeding Bill Settings:', error);
    }
};

module.exports = seedBillSettings;