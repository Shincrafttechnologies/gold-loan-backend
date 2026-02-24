const { Loan, PurchaseBill } = require('../../models');
const { Op } = require('sequelize');

exports.getTotalNetProfit = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let loanWhere = {};
        let purchaseWhere = { status: 'Sold' };
        if (start_date || end_date) {
            const dateFilter = {};

            if (start_date) {
                const startDate = new Date(start_date);
                startDate.setHours(0, 0, 0, 0);
                dateFilter[Op.gte] = startDate;
            }

            if (end_date) {
                const endDate = new Date(end_date);
                endDate.setHours(23, 59, 59, 999);
                dateFilter[Op.lte] = endDate;
            }

            loanWhere.createdAt = dateFilter;
            purchaseWhere.sales_date = dateFilter;
        }

        const [loanProfit, purchaseProfit] = await Promise.all([
            Loan.sum('profit_amount', { where: loanWhere }),
            PurchaseBill.sum('profit', { where: purchaseWhere })
        ]);

        const totalLoanProfit = loanProfit || 0;
        const totalPurchaseProfit = purchaseProfit || 0;
        const totalNetProfit = totalLoanProfit + totalPurchaseProfit;

        res.status(200).json({
            success: true,
            data: {
                total_net_profit: parseFloat(totalNetProfit.toFixed(2)),
                breakdown: {
                    loan_profit: parseFloat(totalLoanProfit.toFixed(2)),
                    purchase_profit: parseFloat(totalPurchaseProfit.toFixed(2))
                },
                filters_applied: {
                    start_date: start_date || null,
                    end_date: end_date || null
                }
            }
        });

    } catch (error) {
        console.error("Error fetching net profit:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch net profit",
            error: error.message
        });
    }
};