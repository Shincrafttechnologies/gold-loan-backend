const { Loan } = require('../models');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.getLoanDetails = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) return res.status(400).json({ success: false, message: "Token Missing" });

        // 1. Verify Token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(403).json({ success: false, message: "Link Expired or Invalid" });
        }

        // 2. Fetch Loan Data
        const loan = await Loan.findOne({ where: { loan_id: decoded.loan_id } });

        if (!loan) {
            return res.status(404).json({ success: false, message: "Loan Not Found" });
        }

        // 3. Return JSON Data (Frontend will use this to render)
        res.status(200).json({
            success: true,
            loan: loan
        });

    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};