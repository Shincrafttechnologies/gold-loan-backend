const { PurchaseBill } = require('../../models');

exports.getPurchaseDashboardStats = async (req, res) => {
    try {
        const [inStockCount, soldCount] = await Promise.all([
            PurchaseBill.count({ where: { status: 'In Stock' } }),
            PurchaseBill.count({ where: { status: 'Sold' } })
        ]);

        res.status(200).json({
            success: true,
            data: {
                in_stock: inStockCount,
                sold: soldCount,
                total_purchases: inStockCount + soldCount
            }
        });

    } catch (error) {
        console.error("Error fetching purchase stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch purchase statistics",
            error: error.message
        });
    }
};