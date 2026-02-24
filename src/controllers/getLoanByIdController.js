const { Loan } = require('../models');

exports.getLoanById = async (req, res) => {
    try {
        const { loan_id } = req.params;

        if (!loan_id) {
            return res.status(400).json({ success: false, message: "Loan ID is required" });
        }

        const loan = await Loan.findOne({
            where: { loan_id },
        });

        if (!loan) {
            return res.status(404).json({ success: false, message: "Loan not found" });
        }

        res.status(200).json({
            success: true,
            loan: loan
        });

    } catch (error) {
        console.error("Error fetching loan:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};