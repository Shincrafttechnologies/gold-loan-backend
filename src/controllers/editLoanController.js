const { Loan, Customer, sequelize, Notification } = require('../models');
const fs = require('fs');
const path = require('path');

exports.editLoan = async (req, res) => {
    let uploadedFilePath = req.file ? req.file.path : null;
    let finalFilePath = null;

    const t = await sequelize.transaction();

    try {
        const { loan_id } = req.params;
        const updates = { ...req.body };

        delete updates.loan_id;
        delete updates.customer_id;

        const loan = await Loan.findOne({ where: { loan_id }, transaction: t });

        if (!loan) {
            await t.rollback();
            if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
            return res.status(404).json({ success: false, message: "Loan not found" });
        }

        ['material_list', 'interest', 'partial_payment'].forEach(field => {
            if (typeof updates[field] === 'string') {
                try { updates[field] = JSON.parse(updates[field]); } catch (e) { }
            }
        });

        if (updates.interest && !Array.isArray(updates.interest)) {
            updates.interest = [updates.interest];
        }

        const currentStatus = loan.status ? loan.status.trim() : '';
        let newStatus = updates.status ? updates.status.trim() : currentStatus;
        if (newStatus === 'Close') {
            newStatus = 'Closed';
            updates.status = 'Closed'; // Ensure the DB saves the correct ENUM
        }

        const isClosing = currentStatus === 'Open' && newStatus === 'Closed';
        const isReopening = currentStatus === 'Closed' && newStatus === 'Open';

        if (isClosing) {
            if (!updates.closing_amount) throw new Error("Closing Amount is required.");
            if (!updates.loan_closing_date) updates.loan_closing_date = new Date();
        } else if (isReopening) {
            updates.loan_closing_date = null;
            updates.closing_amount = null;
        }

        if (isClosing || isReopening) {
            if (isClosing) {
                const closingAmt = parseFloat(updates.closing_amount) || 0;
                await Customer.update({
                    open_loan_cnt: sequelize.literal('open_loan_cnt - 1'),
                    closed_loan_cnt: sequelize.literal('closed_loan_cnt + 1'),
                    total_closed_loan_amt: sequelize.literal(`total_closed_loan_amt + ${closingAmt}`)
                }, {
                    where: { customer_id: loan.customer_id },
                    transaction: t
                });
            } else if (isReopening) {
                const prevClosingAmt = parseFloat(loan.closing_amount) || 0;
                await Customer.update({
                    open_loan_cnt: sequelize.literal('open_loan_cnt + 1'),
                    closed_loan_cnt: sequelize.literal('closed_loan_cnt - 1'),
                    total_closed_loan_amt: sequelize.literal(`total_closed_loan_amt - ${prevClosingAmt}`)
                }, {
                    where: { customer_id: loan.customer_id },
                    transaction: t
                });
            }
        }

        if (req.file) {
            const newFilename = `${loan.customer_id}.jpg`;

            const newPath = path.join(req.file.destination, newFilename);
            const relativePath = `uploads/${newFilename}`;

            if (fs.existsSync(newPath)) {
                try { fs.unlinkSync(newPath); } catch (e) { console.error("Failed to replace old image", e); }
            }
            fs.renameSync(req.file.path, newPath);
            finalFilePath = newPath;

            updates.item_photo_url = relativePath;

            await Customer.update(
                { item_photo_url: relativePath },
                { where: { customer_id: loan.customer_id }, transaction: t }
            );
        }
        if (updates.loan_opening_date) {
            updates.loan_opening_date = new Date(updates.loan_opening_date);
        }
        if (updates.loan_closing_date) {
            updates.loan_closing_date = new Date(updates.loan_closing_date);
        }
        await loan.update(updates, { transaction: t });

        const finalStatus = updates.status || loan.status;
        if (finalStatus === 'Open') {
            const loanOpeningDate = new Date(loan.loan_opening_date);
            let rawDuration = updates.loan_duration_days !== undefined ? updates.loan_duration_days : loan.loan_duration_days;
            const durationDays = parseInt(rawDuration, 10);
            const dueDate = new Date(loanOpeningDate);
            dueDate.setDate(dueDate.getDate() + durationDays);

            const today = new Date();
            const daysRemaining = Math.ceil((dueDate - today) / (24 * 60 * 60 * 1000));

            let notificationType = null;
            let message = null;

            if (daysRemaining < 0) {
                notificationType = 'Alert';
                message = `Loan ID ${loan.loan_id} is OVERDUE by ${Math.abs(daysRemaining)} days.`;
            } else if (daysRemaining <= 5) {
                notificationType = 'Warning';
                message = `Loan ID ${loan.loan_id} is due in ${daysRemaining} days.`;
            }

            if (notificationType) {
                const existingNotif = await Notification.findOne({
                    where: { loan_id: loan.loan_id, type: notificationType, is_active: true },
                    transaction: t
                });

                if (!existingNotif) {
                    const whatsappUrl = `https://wa.me/${loan.phone_no}?text=${encodeURIComponent(message)}`;

                    await Notification.create({
                        loan_id: loan.loan_id,
                        customer_name: loan.customer_name,
                        phone_no: loan.phone_no,
                        type: notificationType,
                        days_diff: Math.abs(daysRemaining),
                        message: message,
                        whatsapp_link: whatsappUrl,
                        is_active: true
                    }, { transaction: t });
                }
            }
        }

        await t.commit();

        res.status(200).json({
            success: true,
            message: "Loan updated successfully",
            loan
        });

    } catch (error) {
        if (t) await t.rollback();
        console.error("Error updating loan:", error);

        if (finalFilePath && fs.existsSync(finalFilePath)) {
            try { fs.unlinkSync(finalFilePath); } catch (e) { }
        } else if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            try { fs.unlinkSync(uploadedFilePath); } catch (e) { }
        }

        res.status(500).json({
            success: false,
            message: error.message || "Failed to update loan",
            error: error.message
        });
    }
};