const { PurchaseBill } = require('../models');
const ExcelJS = require('exceljs');

exports.downloadPurchaseExcel = async (req, res) => {
    try {
        const purchases = await PurchaseBill.findAll({
            order: [['purchase_date', 'DESC']],
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Purchase History');

        worksheet.columns = [
            { header: 'Purchase ID', key: 'purchase_id', width: 15 },
            { header: 'Date', key: 'purchase_date', width: 12 },
            { header: 'Customer', key: 'customer_name', width: 20 },
            { header: 'Reference (Loan)', key: 'loan_reference', width: 15 },
            { header: 'Status', key: 'status', width: 10 }, // In Stock / Sold
            { header: 'Material Type', key: 'material_type', width: 15 },
            { header: 'Items List', key: 'material_list', width: 30 }, // JSON Formatted
            { header: 'Total Weight (g)', key: 'weight_in_grams', width: 15 },
            { header: 'Grade', key: 'grade', width: 10 },
            { header: 'Seal', key: 'seal', width: 10 },
            { header: 'Rate / Gram', key: 'value_per_gram', width: 15 },
            { header: 'Purchase Amt', key: 'total_purchase_amt', width: 15 },
            { header: 'Location', key: 'secure_location', width: 15 },
            { header: 'Notes', key: 'note', width: 20 },
            { header: 'Sold Date', key: 'sales_date', width: 12 },
            { header: 'Sold To', key: 'sold_to', width: 20 },
            { header: 'Sales Amt', key: 'sales_amount', width: 15 },
            { header: 'Profit', key: 'profit', width: 15 }
        ];

        purchases.forEach(p => {
            let formattedMaterials = '';
            if (Array.isArray(p.material_list)) {
                formattedMaterials = p.material_list
                    .map(m => `${m.name || 'Item'} (${m.weight || m.count || ''})`)
                    .join(', ');
            } else {
                formattedMaterials = JSON.stringify(p.material_list);
            }

            const row = worksheet.addRow({
                purchase_id: p.purchase_id,
                purchase_date: p.purchase_date,
                customer_name: p.customer_name,
                loan_reference: p.loan_reference || '-',
                status: p.status,
                material_type: p.material_type,
                material_list: formattedMaterials,
                weight_in_grams: p.weight_in_grams,
                grade: p.grade,
                seal: p.seal,
                value_per_gram: p.value_per_gram,
                total_purchase_amt: p.total_purchase_amt,
                secure_location: p.secure_location,
                note: p.note || '',
                sales_date: p.sales_date || '-',
                sold_to: p.sold_to || '-',
                sales_amount: p.sales_amount || 0,
                profit: p.profit || 0
            });

            if (p.status === 'Sold') {
                row.getCell('status').font = { color: { argb: 'FF008000' }, bold: true };
            } else {
                row.getCell('status').font = { color: { argb: 'FF0000FF' }, bold: true };
            }
        });

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + `Purchase_Report_${Date.now()}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Purchase Export Error:", error);
        res.status(500).json({ success: false, message: "Export Failed", error: error.message });
    }
};