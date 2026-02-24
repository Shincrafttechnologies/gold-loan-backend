const bcrypt = require('bcrypt');
const { Admin } = require('../models');

const seedAdmin = async () => {
    try {
        const adminEmail = 'omsaravananabanker@gmail.com';
        const rawPassword = 'admin12345';

        const existingAdmin = await Admin.findOne({ where: { email: adminEmail } });

        if (!existingAdmin) {
            console.log('⏳ Seeding Default Admin...');

            // Salt= 10
            const hashedPassword = await bcrypt.hash(rawPassword, 10);

            await Admin.create({
                email: adminEmail,
                password_hash: hashedPassword
            });

            console.log('Default Admin Created: ' + adminEmail);
        } else {
            console.log('Admin already exists. Skipping seed.');
        }

    } catch (error) {
        console.error('Failed to seed admin:', error);
    }
};

module.exports = seedAdmin;