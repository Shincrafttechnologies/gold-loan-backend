const { Loan, Customer, BillSettings, Trigger, Notification, RunningBill, sequelize } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');



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
const parseFormat = (formatConfig, defaultPrefix) => {
    const match = (formatConfig || '').match(/^([a-zA-Z]*)(0+)$/);
    if (match) return { prefix: match[1], padLength: match[2].length };
    return { prefix: defaultPrefix, padLength: 4 };
};
exports.getNextLoanId = async (req, res) => {
    try {
        const { bill_type } = req.body;
        if (!bill_type) return res.status(400).json({ success: false, message: "Bill Type is required" });

        const settings = await BillSettings.findOne({ where: { type: bill_type } });
        const formatConfig = settings ? settings.current_series : (bill_type === 'Running' ? 'A0000' : 'N0000');
        const limit = settings ? settings.max_limit : 10000;

        const { prefix, padLength } = parseFormat(formatConfig, bill_type === 'Running' ? 'A' : 'N');

        let lastLoan;
        if (prefix === "") {
            lastLoan = await Loan.findOne({
                where: sequelize.where(
                    sequelize.fn('lower', sequelize.col('loan_id')),
                    sequelize.fn('upper', sequelize.col('loan_id'))
                ),
                order: [['createdAt', 'DESC']],
                attributes: ['loan_id']
            });
        } else {
            lastLoan = await Loan.findOne({
                where: { loan_id: { [Op.like]: `${prefix}%` } },
                order: [['createdAt', 'DESC']],
                attributes: ['loan_id']
            });
        }

        let nextNum = 1;
        if (lastLoan) {
            const numPart = lastLoan.loan_id.substring(prefix.length);
            const parsed = parseInt(numPart);
            if (!isNaN(parsed)) nextNum = parsed + 1;
        }

        const paddedNum = String(nextNum).padStart(padLength, '0');
        const nextLoanId = `${prefix}${paddedNum}`;
        const limitReached = nextNum > limit;

        res.status(200).json({
            success: true,
            bill_type,
            current_series: formatConfig,
            next_loan_id: nextLoanId,
            limit_reached: limitReached,
            limit_message: limitReached ? `Series ${formatConfig} has reached its limit (${limit}).` : null
        });

    } catch (error) {
        console.error("Error fetching next loan ID:", error);
        res.status(500).json({ success: false, message: "Failed to generate Loan ID" });
    }
};

exports.getNewCustomerId = async (req, res) => {
    try {
        const newId = await generateUniqueCustomerId();
        res.status(200).json({
            success: true,
            customer_id: newId
        });
    } catch (error) {
        console.error("ID Generation Error:", error);
        res.status(500).json({ success: false, message: "Could not generate ID" });
    }
};

exports.createLoanBill = async (req, res) => {
    let uploadedFilePath = req.file ? req.file.path : null;

    const t = await sequelize.transaction();

    try {
        const data = req.body;
        if (!data.loan_id) throw new Error("Loan ID is missing.");
        if (!data.bill_type) throw new Error("Bill Type is missing.");
        if (!data.customer_id) throw new Error("Customer ID is missing!");

        const loanStatus = data.status === 'Closed' ? 'Closed' : 'Open';
        const loanClosingDate = loanStatus === 'Closed' ? (data.loan_closing_date || new Date()) : null;

        const requiredCustomerFields = [
            { key: 'customer_name', label: 'Customer Name' },
            { key: 'phone_no', label: 'Phone Number' },
            { key: 'relation_type', label: 'Relation Type' },
            { key: 'relative_name', label: 'Relative Name' },
            { key: 'street', label: 'Street Address' },
            { key: 'area', label: 'Area' },
            { key: 'state', label: 'State' },
            { key: 'pincode', label: 'Pincode' }
        ];

        const missingFields = requiredCustomerFields
            .filter(f => !data[f.key] || String(data[f.key]).trim() === '')
            .map(f => f.label);

        if (missingFields.length > 0) {
            throw new Error(`Please fill out the following required fields: ${missingFields.join(', ')}`);
        }

        const settings = await BillSettings.findOne({ where: { type: data.bill_type } });
        const formatConfig = settings ? settings.current_series : (data.bill_type === 'Running' ? 'A0000' : 'N0000');
        const { prefix } = parseFormat(formatConfig, data.bill_type === 'Running' ? 'A' : 'N');

        if (prefix === "") {
            if (!/^[0-9]+$/.test(data.loan_id)) {
                throw new Error(`Invalid Loan ID Format. The Current Running series format requires a numeric-only ID without letters. Received '${data.loan_id}'.`);
            }
        } else {
            if (!data.loan_id.startsWith(prefix)) {
                throw new Error(`Invalid Loan ID Format. Current '${data.bill_type}' series expects prefix '${prefix}', but received '${data.loan_id}'.`);
            }
        }

        const existingLoan = await Loan.findOne({ where: { loan_id: data.loan_id } });
        if (existingLoan) {
            throw new Error(`Loan ID ${data.loan_id} already exists in the main Loans table!`);
        }

        if (data.bill_type === 'Running') {
            const existingRunningBill = await RunningBill.findOne({ where: { loan_id: data.loan_id } });
            if (existingRunningBill) {
                throw new Error(`Loan ID ${data.loan_id} has a conflicting 'ghost record' in the RunningBills table. Please use a different ID or clear the orphaned record from the database.`);
            }
        }

        let materialList = [];
        try {
            materialList = typeof data.material_list === 'string' ? JSON.parse(data.material_list) : (data.material_list || []);
        } catch (e) {
            console.warn("Failed to parse material_list");
            materialList = [];
        }

        let interestData = [];
        try {
            let parsedInterest = data.interest;

            if (typeof data.interest === 'string') {
                if (data.interest.includes('[object Object]')) {
                    parsedInterest = [];
                } else {
                    parsedInterest = JSON.parse(data.interest);
                }
            }

            if (!Array.isArray(parsedInterest)) {
                parsedInterest = parsedInterest ? [parsedInterest] : [];
            }
            interestData = parsedInterest
                .map(val => parseFloat(val))
                .filter(val => !isNaN(val));

        } catch (e) {
            console.warn("Failed to parse interest");
            interestData = [];
        }

        const sentCustomerId = data.customer_id;

        let finalPhotoPath = null;
        if (req.file) {
            const oldPath = req.file.path;
            const extension = '.jpg';
            const newFilename = `${sentCustomerId}${extension}`;
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

        let customer = await Customer.findOne({ where: { customer_id: sentCustomerId } });
        if (customer) {
            const updateData = {
                total_loan_cnt: sequelize.literal('total_loan_cnt + 1')
            };

            if (loanStatus === 'Open') {
                updateData.open_loan_cnt = sequelize.literal('open_loan_cnt + 1');
            } else {
                updateData.closed_loan_cnt = sequelize.literal('closed_loan_cnt + 1');
                updateData.total_closed_loan_amt = sequelize.literal(`total_closed_loan_amt + ${parseFloat(data.total_amount) || 0}`);
            }

            if (finalPhotoPath) {
                updateData.item_photo_url = finalPhotoPath;
            }
            await customer.update(updateData, { transaction: t });
        } else {
            customer = await Customer.create({
                customer_id: sentCustomerId,
                name: data.customer_name,
                phone_no: data.phone_no,
                relation_type: data.relation_type,
                relative_name: data.relative_name,
                street: data.street,
                area: data.area,
                state: data.state,
                pincode: data.pincode,
                open_loan_cnt: loanStatus === 'Open' ? 1 : 0,
                total_loan_cnt: 1,
                closed_loan_cnt: loanStatus === 'Closed' ? 1 : 0,
                total_closed_loan_amt: loanStatus === 'Closed' ? (parseFloat(data.total_amount) || 0) : 0,
                item_photo_url: finalPhotoPath
            }, { transaction: t });
        }

        const newLoan = await Loan.create({
            loan_id: data.loan_id,
            customer_id: customer.customer_id,
            customer_name: data.customer_name,
            phone_no: data.phone_no,
            relation_type: data.relation_type,
            relative_name: data.relative_name,
            street: data.street,
            state: data.state,
            area: data.area,
            pincode: data.pincode,

            material_list: materialList,
            material_type: data.material_type,
            total_weight: parseFloat(data.total_weight) || 0,
            value_per_gram: parseFloat(data.value_per_gram) || 0,
            item_photo_url: finalPhotoPath,

            present_value: parseFloat(data.present_value) || 0,
            total_amount: parseFloat(data.total_amount) || 0,
            interest: interestData,
            processing_fee: parseFloat(data.processing_fee) || 0,
            profit_amount: parseFloat(data.profit_amount) || 0,
            pending_amount: parseFloat(data.pending_amount) || 0,
            prediction_closing_amount: parseFloat(data.prediction_closing_amount) || 0,
            loan_total_months: parseInt(data.loan_duration_months) || 0,
            loan_total_days: parseInt(data.loan_duration_days) || 0,

            bill_type: data.bill_type,
            secure_location: data.secure_location,
            location_details: data.location_details,
            loan_duration_months: data.loan_duration_months,
            loan_duration_days: data.loan_duration_days,

            loan_closing_date: loanClosingDate,
            alert_count: parseInt(data.alert_count) || 0,
            remark: data.remark,
            status: loanStatus
        }, { transaction: t });

        if (data.bill_type === 'Running') {
            const principal = parseFloat(data.total_amount) || 0;
            const durationMonths = parseInt(data.loan_duration_months) || 0;

            const shadowInterestRate = 0.01;
            const shadowProfit = principal * shadowInterestRate * durationMonths;
            const shadowPrediction = principal + shadowProfit;
            await RunningBill.create({
                ...newLoan.toJSON(),
                interest: [shadowInterestRate],
                profit_amount: shadowProfit,
                prediction_closing_amount: shadowPrediction,
                loan_id: newLoan.loan_id
            }, { transaction: t });
        }

        try {
            if (loanStatus === 'Open') {
                const alertTrigger = await Trigger.findOne({ where: { type: 'Alert' } });

                if (alertTrigger) {
                    const alertThreshold = alertTrigger.trigger_days || 4;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const openDate = new Date(newLoan.loan_opening_date);
                    const dueDate = new Date(openDate);
                    dueDate.setDate(openDate.getDate() + newLoan.loan_duration_days);
                    dueDate.setHours(0, 0, 0, 0);

                    const diffTime = dueDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= alertThreshold && diffDays >= 0) {

                        let rawMsg = alertTrigger.message_format;
                        let finalMsg = rawMsg
                            .replace(/{NAME}/g, newLoan.customer_name)
                            .replace(/{LOAN_ID}/g, newLoan.loan_id)
                            .replace(/{AMOUNT}/g, newLoan.total_amount)
                            .replace(/{DATE}/g, dueDate.toLocaleDateString())
                            .replace(/{DAYS}/g, diffDays);

                        const whatsappUrl = `https://wa.me/${newLoan.phone_no}?text=${encodeURIComponent(finalMsg)}`;

                        await Notification.create({
                            loan_id: newLoan.loan_id,
                            customer_name: newLoan.customer_name,
                            phone_no: newLoan.phone_no,
                            type: 'Alert',
                            days_diff: diffDays,
                            message: finalMsg,
                            whatsapp_link: whatsappUrl,
                            is_active: true
                        }, { transaction: t });
                        console.log(`Immediate Alert generated for ${newLoan.loan_id} (Due in ${diffDays} days)`);
                    }
                }
            }
        } catch (notifError) {
            console.error("Failed to create NewLoan notification:", notifError);
        }

        await t.commit();

        res.status(201).json({
            success: true,
            message: "Loan Bill Created Successfully",
            loan: newLoan,
            customer_id: customer.customer_id
        });

    } catch (error) {
        await t.rollback();
        console.error("Error creating loan:", error);
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
        }
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create loan bill"
        });
    }
};