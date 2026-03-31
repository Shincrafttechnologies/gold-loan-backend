const { PurchaseBill } = require('../models');

exports.editPurchaseBill = async (req, res) => {
    try {
        const { purchase_id } = req.params;
        const updates = req.body || {};

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Backend received an empty body. Please check your frontend Content-Type headers!"
            });
        }

        const bill = await PurchaseBill.findOne({ where: { purchase_id } });

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: "Purchase Bill not found"
            });
        }

        if (typeof updates.material_list === 'string') {
            try { updates.material_list = JSON.parse(updates.material_list); } catch (e) { }
        }

        const finalSalesDate = updates.sales_date !== undefined ? updates.sales_date : bill.sales_date;
        const finalSoldTo = updates.sold_to !== undefined ? updates.sold_to : bill.sold_to;
        const finalSalesAmount = updates.sales_amount !== undefined ? parseFloat(updates.sales_amount) : bill.sales_amount;

        if (finalSalesDate && finalSoldTo && finalSalesAmount) {

            updates.status = 'Sold';

            const finalPurchaseAmount = updates.total_purchase_amt !== undefined ? parseFloat(updates.total_purchase_amt) : bill.total_purchase_amt;
            updates.profit = finalSalesAmount - finalPurchaseAmount;

        } else {
            updates.status = 'In Stock';

            updates.sales_date = null;
            updates.sold_to = null;
            updates.sales_amount = null;
            updates.profit = null;
        }

        await bill.update(updates);

        res.status(200).json({
            success: true,
            message: "Purchase Bill updated successfully",
            bill
        });

    } catch (error) {
        console.error("Error updating purchase bill:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update purchase bill",
            error: error.message
        });
    }
};