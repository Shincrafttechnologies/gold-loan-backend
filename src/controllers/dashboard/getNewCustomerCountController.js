const { Customer, Loan } = require('../../models');
const { Op } = require('sequelize');

exports.getNewCustomersCount = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let whereClause = {};

        if (start_date || end_date) {
            whereClause.createdAt = {};

            if (start_date) {
                const startDate = new Date(start_date);
                startDate.setHours(0, 0, 0, 0);
                whereClause.createdAt[Op.gte] = startDate;
            }

            if (end_date) {
                const endDate = new Date(end_date);
                endDate.setHours(23, 59, 59, 999);
                whereClause.createdAt[Op.lte] = endDate;
            }
        }

        const newCustomersCount = await Customer.count({
            where: whereClause
        });

        res.status(200).json({
            success: true,
            data: {
                new_customers: newCustomersCount,
                filters_applied: {
                    start_date: start_date || null,
                    end_date: end_date || null
                }
            }
        });

    } catch (error) {
        console.error("Error fetching new customer count:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch new customer count",
            error: error.message
        });
    }
};

exports.getLatestLoanIds = async (req, res) => {
    try {
        const [lastRunningLoan, lastPersonalLoan] = await Promise.all([
            Loan.findOne({
                where: { bill_type: 'Running' },
                order: [['createdAt', 'DESC']],
                attributes: ['loan_id']
            }),
            Loan.findOne({
                where: { bill_type: 'Personal' },
                order: [['createdAt', 'DESC']],
                attributes: ['loan_id']
            })
        ]);

        res.status(200).json({
            success: true,
            data: {
                last_running_id: lastRunningLoan ? lastRunningLoan.loan_id : 'N/A',
                last_personal_id: lastPersonalLoan ? lastPersonalLoan.loan_id : 'N/A'
            }
        });

    } catch (error) {
        console.error("Error fetching latest loan IDs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch latest loan IDs",
            error: error.message
        });
    }
};