const { Loan, PurchaseBill } = require('../../models');

exports.getInventoryPieChart = async (req, res) => {
    try {
        const [
            loanBankWeight,
            loanLockerWeight,
            purchaseBankWeight,
            purchasePersonalWeight,
            soldWeight
        ] = await Promise.all([
            Loan.sum('total_weight', {
                where: { status: 'Open', material_type: 'Gold', secure_location: 'Bank' }
            }),
            Loan.sum('total_weight', {
                where: { status: 'Open', material_type: 'Gold', secure_location: 'Locker' }
            }),
            PurchaseBill.sum('weight_in_grams', {
                where: { status: 'In Stock', material_type: 'Gold', secure_location: 'Bank' }
            }),
            PurchaseBill.sum('weight_in_grams', {
                where: { status: 'In Stock', material_type: 'Gold', secure_location: 'Personal' }
            }),
            PurchaseBill.sum('weight_in_grams', {
                where: { status: 'Sold', material_type: 'Gold' }
            })
        ]);

        const totalBank = (loanBankWeight || 0) + (purchaseBankWeight || 0);
        const totalLocker = (loanLockerWeight || 0) + (purchasePersonalWeight || 0);
        const totalSold = soldWeight || 0;

        res.status(200).json({
            success: true,
            chart_data: [
                {
                    id: "bank",
                    label: "In Bank",
                    value: parseFloat(totalBank.toFixed(2))
                },
                {
                    id: "locker",
                    label: "In Locker",
                    value: parseFloat(totalLocker.toFixed(2))
                },
                {
                    id: "sold",
                    label: "Sold",
                    value: parseFloat(totalSold.toFixed(2))
                }
            ],
            summary: {
                total_gold_handled_grams: parseFloat((totalBank + totalLocker + totalSold).toFixed(2)),
                total_in_stock_grams: parseFloat((totalBank + totalLocker).toFixed(2))
            }
        });

    } catch (error) {
        console.error("Error fetching inventory chart data:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch inventory chart data",
            error: error.message
        });
    }
};