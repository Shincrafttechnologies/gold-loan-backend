const { PurchaseBill } = require('../models');

exports.deletePurchaseBill = async (req, res) => {
    try {
        const { purchase_id } = req.params;

        const bill = await PurchaseBill.findOne({ where: { purchase_id } });

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: `Purchase Bill with ID ${purchase_id} not found`
            });
        }

        await bill.destroy();

        res.status(200).json({
            success: true,
            message: `Purchase Bill ${purchase_id} deleted successfully.`
        });

    } catch (error) {
        console.error("Error deleting purchase bill:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete purchase bill",
            error: error.message
        });
    }
};