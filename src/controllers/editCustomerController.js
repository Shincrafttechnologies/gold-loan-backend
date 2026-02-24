const { Customer } = require('../models');
const fs = require('fs');
const path = require('path');

exports.editCustomer = async (req, res) => {
    let uploadedFilePath = req.file ? req.file.path : null;
    let finalFilePath = null;

    try {
        const { customer_id } = req.params;
        const updates = req.body;

        const customer = await Customer.findOne({ where: { customer_id } });

        if (!customer) {
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


        await customer.update(allowedUpdates);

        res.status(200).json({
            success: true,
            message: "Customer details updated successfully",
            customer
        });

    } catch (error) {
        console.error("Error updating customer:", error);

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