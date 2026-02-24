const { Loan } = require('../../models');

exports.getLoanStatusDistribution = async (req, res) => {
    try {
        const [openCount, closedCount] = await Promise.all([
            Loan.count({ where: { status: 'Open' } }),
            Loan.count({ where: { status: 'Closed' } })
        ]);

        res.status(200).json({
            success: true,
            chart_data: [
                {
                    id: "open",
                    label: "Open Loans",
                    value: openCount
                },
                {
                    id: "closed",
                    label: "Closed Loans",
                    value: closedCount
                }
            ],
            summary: {
                total_loans: openCount + closedCount
            }
        });

    } catch (error) {
        console.error("Error fetching loan status distribution:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch loan status distribution",
            error: error.message
        });
    }
};