const { Loan } = require('../../models');
const { Op } = require('sequelize');

exports.getLoanFinancialSummary = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let openDateWhere = {};

        let closeDateWhere = { status: 'Closed' };

        if (start_date || end_date) {
            const dateFilter = {};

            if (start_date) {
                const startDateObj = new Date(start_date);
                startDateObj.setHours(0, 0, 0, 0);
                dateFilter[Op.gte] = startDateObj;
            }

            if (end_date) {
                const endDateObj = new Date(end_date);
                endDateObj.setHours(23, 59, 59, 999);
                dateFilter[Op.lte] = endDateObj;
            }

            openDateWhere.loan_opening_date = dateFilter;
            closeDateWhere.loan_closing_date = dateFilter;
        }

        const [disbursedAmount, collectedAmount] = await Promise.all([
            Loan.sum('total_amount', { where: openDateWhere }),
            Loan.sum('closing_amount', { where: closeDateWhere })
        ]);
        const totalDisbursed = parseFloat(disbursedAmount) || 0;
        const totalCollected = parseFloat(collectedAmount) || 0;

        res.status(200).json({
            success: true,
            data: {
                total_disbursed: parseFloat(totalDisbursed.toFixed(2)),
                total_collected: parseFloat(totalCollected.toFixed(2))
            },
            filters_applied: {
                start_date: start_date || null,
                end_date: end_date || null
            }
        });

    } catch (error) {
        console.error("Error fetching financial summary:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch financial summary",
            error: error.message
        });
    }
};