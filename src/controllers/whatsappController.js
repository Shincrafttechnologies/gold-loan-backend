const { Loan, Trigger } = require('../models');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.generateWhatsappBillLink = async (req, res) => {
    try {
        const { loan_id } = req.body;

        if (!loan_id) {
            return res.status(400).json({ success: false, message: "Loan ID is required" });
        }

        const loan = await Loan.findOne({ where: { loan_id } });
        if (!loan) {
            return res.status(404).json({ success: false, message: "Loan not found" });
        }

        const token = jwt.sign({ loan_id: loan.loan_id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const downloadLink = `${frontendUrl}/bill-view?token=${token}`;

        const trigger = await Trigger.findOne({ where: { type: 'NewLoan' } });

        let message = '';

        if (trigger && trigger.message_format) {
            message = trigger.message_format
                .replace(/{NAME}/g, loan.customer_name)
                .replace(/{LOAN_ID}/g, loan.loan_id)
                .replace(/{AMOUNT}/g, loan.total_amount)
                .replace(/{DATE}/g, new Date(loan.loan_opening_date).toLocaleDateString('en-IN'))
                .replace(/{LINK}/g, downloadLink);
        } else {
            message = `Hello ${loan.customer_name},\n\nPlease find your Loan Receipt for Loan ID: ${loan.loan_id} in the link below:\n\n${downloadLink}\n\nThank you.`;
        }

        const whatsappUrl = `https://wa.me/${loan.phone_no}?text=${encodeURIComponent(message)}`;

        res.status(200).json({
            success: true,
            loan_id: loan.loan_id,
            whatsapp_url: whatsappUrl,
            direct_link: downloadLink
        });

    } catch (error) {
        console.error("Link Gen Error:", error);
        res.status(500).json({ success: false, message: "Failed to generate link" });
    }
};