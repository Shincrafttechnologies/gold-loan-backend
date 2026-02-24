const { Loan, PurchaseBill } = require('../../models');
const { Op } = require('sequelize');

const toLocalDateString = (dateObj) => {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

exports.getCashFlowTrendChart = async (req, res) => {
    try {
        let { start_date, end_date } = req.query;

        // Default to the last 30 days if no dates are provided
        const endDateObj = end_date ? new Date(end_date) : new Date();
        const startDateObj = start_date ? new Date(start_date) : new Date();
        if (!start_date) {
            startDateObj.setDate(endDateObj.getDate() - 30);
        }

        // Set exact time boundaries
        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);

        // We fetch ANY loan that might have had activity (opened, closed, or updated with partial payments) during this period
        const loans = await Loan.findAll({
            where: {
                [Op.or]: [
                    { loan_opening_date: { [Op.gte]: startDateObj, [Op.lte]: endDateObj } },
                    { loan_closing_date: { [Op.gte]: startDateObj, [Op.lte]: endDateObj } },
                    { updatedAt: { [Op.gte]: startDateObj, [Op.lte]: endDateObj } }
                ]
            }
        });

        // Fetch ANY purchase that was bought or sold during this period
        const purchases = await PurchaseBill.findAll({
            where: {
                [Op.or]: [
                    { purchase_date: { [Op.gte]: startDateObj, [Op.lte]: endDateObj } },
                    { sales_date: { [Op.gte]: startDateObj, [Op.lte]: endDateObj } }
                ]
            }
        });

        // Generate an empty dictionary of all dates in the range to ensure continuous lines on the chart
        const dailyDataMap = {};
        for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
            const dateString = toLocalDateString(d);
            dailyDataMap[dateString] = {
                date: dateString,
                money_in: 0,
                money_out: 0,
                // We also provide the breakdown for detailed tooltips!
                breakdown: { loans_out: 0, purchases_out: 0, loans_in: 0, purchases_in: 0 }
            };
        }

        // 1. Process Loans (Money Out on opening, Money In on closing & partial payments)
        loans.forEach(loan => {
            // Money Out (Disbursements)
            if (loan.loan_opening_date) {
                const openDate = toLocalDateString(new Date(loan.loan_opening_date));
                if (dailyDataMap[openDate]) {
                    const amountOut = parseFloat(loan.total_amount) || 0;
                    dailyDataMap[openDate].money_out += amountOut;
                    dailyDataMap[openDate].breakdown.loans_out += amountOut;
                }
            }

            // Money In (Final Closing Settlement)
            if (loan.status === 'Closed' && loan.loan_closing_date) {
                const closeDate = toLocalDateString(new Date(loan.loan_closing_date));
                if (dailyDataMap[closeDate]) {
                    const amountIn = parseFloat(loan.closing_amount) || 0;
                    dailyDataMap[closeDate].money_in += amountIn;
                    dailyDataMap[closeDate].breakdown.loans_in += amountIn;
                }
            }

            // Money In (Partial Payments)
            let partialPayments = [];
            if (typeof loan.partial_payment === 'string') {
                try { partialPayments = JSON.parse(loan.partial_payment); } catch (e) { }
            } else if (Array.isArray(loan.partial_payment)) {
                partialPayments = loan.partial_payment;
            }

            partialPayments.forEach(payment => {
                if (payment.date) {
                    const payDate = toLocalDateString(new Date(payment.date));
                    if (dailyDataMap[payDate]) {
                        // Total collected that day is principal + interest
                        const amountIn = (parseFloat(payment.principal) || 0) + (parseFloat(payment.interest) || 0);
                        dailyDataMap[payDate].money_in += amountIn;
                        dailyDataMap[payDate].breakdown.loans_in += amountIn;
                    }
                }
            });
        });

        // 2. Process Purchase Bills (Money Out on purchase, Money In on sale)
        purchases.forEach(purchase => {
            // Money Out (Buying Gold)
            if (purchase.purchase_date) {
                const pDate = toLocalDateString(new Date(purchase.purchase_date));
                if (dailyDataMap[pDate]) {
                    const amountOut = parseFloat(purchase.total_purchase_amt) || 0;
                    dailyDataMap[pDate].money_out += amountOut;
                    dailyDataMap[pDate].breakdown.purchases_out += amountOut;
                }
            }

            // Money In (Selling Gold)
            if (purchase.status === 'Sold' && purchase.sales_date) {
                const sDate = toLocalDateString(new Date(purchase.sales_date));
                if (dailyDataMap[sDate]) {
                    const amountIn = parseFloat(purchase.sales_amount) || 0;
                    dailyDataMap[sDate].money_in += amountIn;
                    dailyDataMap[sDate].breakdown.purchases_in += amountIn;
                }
            }
        });

        // Convert the dictionary back into an ordered array for the frontend chart
        const chartData = Object.values(dailyDataMap).sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            success: true,
            chart_data: chartData,
            filters_applied: {
                start_date: toLocalDateString(startDateObj),
                end_date: toLocalDateString(endDateObj)
            }
        });

    } catch (error) {
        console.error("Error fetching cash flow trend:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch cash flow trend data",
            error: error.message
        });
    }
};