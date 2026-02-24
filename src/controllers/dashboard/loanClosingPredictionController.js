const { Loan } = require('../../models');

const toLocalDateString = (dateObj) => {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

exports.getUpcomingClosingLoansChart = async (req, res) => {
    try {
        let { end_date } = req.query;

        const startDateObj = new Date();
        startDateObj.setHours(0, 0, 0, 0);

        const endDateObj = end_date ? new Date(end_date) : new Date();
        if (!end_date) {
            endDateObj.setDate(startDateObj.getDate() + 30);
        }
        endDateObj.setHours(23, 59, 59, 999);

        const openLoans = await Loan.findAll({
            where: { status: 'Open' },
            attributes: [
                'loan_id',
                'loan_opening_date',
                'loan_duration_months',
                'loan_duration_days',
                'total_amount',
                'prediction_closing_amount'
            ]
        });

        const dailyDataMap = {};
        for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
            const dateString = toLocalDateString(d);
            dailyDataMap[dateString] = {
                date: dateString,
                loans_closing_count: 0,
                expected_principal: 0,
                expected_total_collection: 0
            };
        }

        openLoans.forEach(loan => {
            if (!loan.loan_opening_date) return;

            const dueDate = new Date(loan.loan_opening_date);

            if (loan.loan_duration_months) {
                dueDate.setMonth(dueDate.getMonth() + parseInt(loan.loan_duration_months, 10));
            }
            if (loan.loan_duration_days) {
                dueDate.setDate(dueDate.getDate() + parseInt(loan.loan_duration_days, 10));
            }

            if (dueDate >= startDateObj && dueDate <= endDateObj) {
                const dueDateString = toLocalDateString(dueDate);

                if (dailyDataMap[dueDateString]) {
                    dailyDataMap[dueDateString].loans_closing_count += 1;
                    dailyDataMap[dueDateString].expected_principal += parseFloat(loan.total_amount) || 0;

                    const predictedCollection = parseFloat(loan.prediction_closing_amount) || parseFloat(loan.total_amount) || 0;
                    dailyDataMap[dueDateString].expected_total_collection += predictedCollection;
                }
            }
        });

        const chartData = Object.values(dailyDataMap).sort((a, b) => new Date(a.date) - new Date(b.date));

        const totalUpcomingCount = chartData.reduce((sum, day) => sum + day.loans_closing_count, 0);
        const totalUpcomingValue = chartData.reduce((sum, day) => sum + day.expected_total_collection, 0);

        res.status(200).json({
            success: true,
            summary: {
                total_upcoming_closures: totalUpcomingCount,
                expected_cash_inflow: parseFloat(totalUpcomingValue.toFixed(2))
            },
            chart_data: chartData,
            filters_applied: {
                start_date: toLocalDateString(startDateObj),
                end_date: toLocalDateString(endDateObj)
            }
        });

    } catch (error) {
        console.error("Error fetching upcoming closing loans:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch upcoming loan closures",
            error: error.message
        });
    }
};