const { Loan, Customer } = require('../models');
const fs = require('fs');
const path = require('path');

exports.deleteLoanById = async (req, res) => {
    try {
        const { loan_id } = req.params;

        const loan = await Loan.findOne({ where: { loan_id } });

        if (!loan) {
            return res.status(404).json({
                success: false,
                message: "Loan not found"
            });
        }

        if (loan.item_photo_url) {
            const fullPath = path.join(__dirname, '..', loan.item_photo_url);

            if (fs.existsSync(fullPath)) {
                try {
                    fs.unlinkSync(fullPath);
                    console.log(`Deleted image: ${fullPath}`);
                } catch (err) {
                    console.error("Failed to delete image file:", err);
                }
            }
        }

        const customer = await Customer.findOne({ where: { customer_id: loan.customer_id } });

        if (customer) {
            if (loan.status === 'Active') {
                await customer.decrement(['open_loan_cnt', 'total_loan_cnt']);
            } else if (loan.status === 'Closed') {
                await customer.decrement(['closed_loan_cnt', 'total_loan_cnt']);
            }
        }

        await loan.destroy();

        res.status(200).json({
            success: true,
            message: `Loan ${loan_id} deleted successfully`
        });

    } catch (error) {
        console.error("Error deleting loan:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete loan",
            error: error.message
        });
    }
};