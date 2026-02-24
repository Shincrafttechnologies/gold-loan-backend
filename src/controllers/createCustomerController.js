const fs = require('fs');
const path = require('path');
const { Customer } = require('../models');

const generateUniqueCustomerId = async () => {
    let unique = false;
    let newId = 0;
    let attempts = 0;
    const maxAttempts = 20;

    while (!unique && attempts < maxAttempts) {
        attempts++;
        newId = Math.floor(100000 + Math.random() * 900000);

        const existingCustomer = await Customer.findOne({
            where: { customer_id: newId },
            attributes: ['customer_id']
        });

        if (!existingCustomer) {
            unique = true;
        }
    }

    if (!unique) throw new Error("Could not generate unique Customer ID");
    return newId;
};

exports.createCustomer = async (req, res) => {
    let uploadedFilePath = req.file ? req.file.path : null;
    try {
        const {
            name,
            phone_no,
            relation_type,
            relative_name,
            street,
            area,
            state,
            pincode
        } = req.body;

        if (!name || !phone_no || !relation_type || !relative_name || !area) {
            throw new Error("Missing required fields.");
        }
        const generatedCustomerId = await generateUniqueCustomerId();

        let finalPhotoPath = null;
        if (req.file) {
            const oldPath = req.file.path;
            const extension = '.jpg';
            const newFilename = `${generatedCustomerId}${extension}`;
            const newPath = path.join(req.file.destination, newFilename);

            if (fs.existsSync(newPath)) {
                try {
                    fs.unlinkSync(newPath);
                } catch (e) { }
            }
            fs.renameSync(oldPath, newPath);
            uploadedFilePath = newPath;
            finalPhotoPath = `uploads/${newFilename}`;
        }

        const newCustomer = await Customer.create({
            customer_id: generatedCustomerId,
            name,
            phone_no,
            relation_type,
            relative_name: relative_name,
            street,
            area,
            state: state || 'Puducherry',
            pincode,
            item_photo_url: finalPhotoPath,
            open_loan_cnt: 0,
            total_loan_cnt: 0,
            closed_loan_cnt: 0,
            total_closed_loan_amt: 0
        });

        res.status(201).json({
            success: true,
            message: "Customer added successfully",
            customer: newCustomer
        });

    } catch (error) {
        console.error("Error adding customer:", error);

        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            try {
                fs.unlinkSync(uploadedFilePath);
            } catch (cleanupError) {
                console.error("Failed to clean up file:", cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            message: "Failed to add customer",
            error: error.message
        });
    }
};