const { Loan, PurchaseBill } = require('../../models');
const { Op } = require('sequelize');

exports.getProfitTrendChart = async (req, res) => {
    try {
        let { start_date, end_date } = req.query;

        const endDateObj = end_date ? new Date(end_date) : new Date();
        const startDateObj = start_date ? new Date(start_date) : new Date();
        if (!start_date) {
            startDateObj.setDate(endDateObj.getDate() - 30);
        }

        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);

        const closedLoans = await Loan.findAll({
            where: {
                status: 'Closed',
                loan_closing_date: {
                    [Op.gte]: startDateObj,
                    [Op.lte]: endDateObj
                }
            },
            attributes: ['loan_closing_date', 'profit_amount']
        });

        const soldPurchases = await PurchaseBill.findAll({
            where: {
                status: 'Sold',
                sales_date: {
                    [Op.gte]: startDateObj,
                    [Op.lte]: endDateObj
                }
            },
            attributes: ['sales_date', 'profit']
        });

        const dailyDataMap = {};
        for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            dailyDataMap[dateString] = {
                date: dateString,
                loan_profit: 0,
                sales_profit: 0
            };
        }

        closedLoans.forEach(loan => {
            if (!loan.loan_closing_date) return;
            const dateString = new Date(loan.loan_closing_date).toISOString().split('T')[0];
            if (dailyDataMap[dateString]) {
                dailyDataMap[dateString].loan_profit += parseFloat(loan.profit_amount) || 0;
            }
        });

        soldPurchases.forEach(purchase => {
            if (!purchase.sales_date) return;
            const dateString = new Date(purchase.sales_date).toISOString().split('T')[0];
            if (dailyDataMap[dateString]) {
                dailyDataMap[dateString].sales_profit += parseFloat(purchase.profit) || 0;
            }
        });

        const chartData = Object.values(dailyDataMap).sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            success: true,
            chart_data: chartData,
            filters_applied: {
                start_date: startDateObj.toISOString().split('T')[0],
                end_date: endDateObj.toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error("Error fetching profit trend:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch profit trend data",
            error: error.message
        });
    }
};