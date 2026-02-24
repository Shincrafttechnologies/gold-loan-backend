const { PurchaseBill } = require('../models');

exports.createPurchaseBill = async (req, res) => {
    try {
        const data = req.body;

        if (!data.customer_name || !data.weight_in_grams || !data.total_purchase_amt) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: customer_name, weight, total_amount"
            });
        }

        const maxId = await PurchaseBill.max('purchase_id');
        const nextId = maxId ? maxId + 1 : 1;

        let materialList = [];
        if (typeof data.material_list === 'string') {
            try { materialList = JSON.parse(data.material_list); } catch (e) { }
        } else {
            materialList = data.material_list || [];
        }

        let currentStatus = 'In Stock';
        let salesDate = null;
        let soldTo = null;
        let salesAmount = null;
        let profit = null;

        if (data.sales_amount && data.sold_to) {
            currentStatus = 'Sold';
            soldTo = data.sold_to;
            salesAmount = parseFloat(data.sales_amount);
            salesDate = data.sales_date || new Date();

            const purchaseAmt = parseFloat(data.total_purchase_amt);
            if (data.profit) {
                profit = parseFloat(data.profit);
            } else {
                profit = salesAmount - purchaseAmt;
            }
        }

        const newBill = await PurchaseBill.create({
            purchase_id: nextId,
            customer_name: data.customer_name,
            purchase_date: data.purchase_date || new Date(),
            loan_reference: data.loan_reference,
            material_list: materialList,
            material_type: data.material_type || 'Gold',
            weight_in_grams: parseFloat(data.weight_in_grams),
            value_per_gram: parseFloat(data.value_per_gram) || 0,
            total_purchase_amt: parseFloat(data.total_purchase_amt),
            secure_location: data.secure_location,
            note: data.note,
            seal: data.seal,
            grade: data.grade,
            status: currentStatus,
            sales_date: salesDate,
            sold_to: soldTo,
            sales_amount: salesAmount,
            profit: profit
        });

        res.status(201).json({
            success: true,
            message: currentStatus === 'Sold'
                ? "Purchase & Sales recorded successfully"
                : "Purchase Bill created successfully",
            bill: newBill
        });

    } catch (error) {
        console.error("Error creating purchase bill:", error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: "ID conflict occurred. Please try again to generate a new ID."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create purchase bill",
            error: error.message
        });
    }
};