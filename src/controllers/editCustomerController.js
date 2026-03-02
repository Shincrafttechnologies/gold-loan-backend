const { Customer, Loan, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');

exports.editCustomer = async (req, res) => {
    let uploadedFilePath = req.file ? req.file.path : null;
    let finalFilePath = null;

    const t = await sequelize.transaction();

    try {
        const { customer_id } = req.params;
        const updates = req.body;

        const customer = await Customer.findOne({
            where: { customer_id },
            transaction: t
        });

        if (!customer) {
            await t.rollback();
            if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
                fs.unlinkSync(uploadedFilePath);
            }
            return res.status(404).json({
                success: false,
                message: `Customer with ID ${customer_id} not found`
            });
        }

        const allowedUpdates = {};
        const fields = ['name', 'phone_no', 'relation_type', 'relative_name', 'street', 'area', 'state', 'pincode'];

        fields.forEach(field => {
            if (updates[field] !== undefined) allowedUpdates[field] = updates[field];
        });

        if (req.file) {
            const newFilename = `${customer_id}.jpg`;
            const newPath = path.join(req.file.destination, newFilename);
            const relativePath = `uploads/${newFilename}`;

            if (fs.existsSync(newPath)) {
                try {
                    fs.unlinkSync(newPath);
                } catch (e) {
                    console.error("Failed to delete old image:", e);
                }
            }

            fs.renameSync(req.file.path, newPath);
            finalFilePath = newPath;
            allowedUpdates.item_photo_url = relativePath;
        }

        await customer.update(allowedUpdates, { transaction: t });

        const loanUpdates = { ...allowedUpdates };

        if (loanUpdates.name) {
            loanUpdates.customer_name = loanUpdates.name;
            delete loanUpdates.name;
        }

        if (Object.keys(loanUpdates).length > 0) {
            await Loan.update(loanUpdates, {
                where: { customer_id: customer.customer_id },
                transaction: t
            });
        }

        await t.commit();

        res.status(200).json({
            success: true,
            message: "Customer and associated loans updated successfully",
            customer
        });

    } catch (error) {
        // ❌ If ANYTHING fails, roll back the database so no partial updates happen
        if (t) await t.rollback();

        console.error("Error updating customer:", error);

        // Clean up any files that were uploaded during this failed attempt
        if (finalFilePath && fs.existsSync(finalFilePath)) {
            try { fs.unlinkSync(finalFilePath); } catch (e) { }
        } else if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            try { fs.unlinkSync(uploadedFilePath); } catch (e) { }
        }

        res.status(500).json({
            success: false,
            message: "Failed to update customer",
            error: error.message
        });
    }
};