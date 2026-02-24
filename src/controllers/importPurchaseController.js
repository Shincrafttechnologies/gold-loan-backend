const { PurchaseBill } = require('../models');
const ExcelJS = require('exceljs');

const importProgressMap = new Map();

exports.getImportProgress = (req, res) => {
    const { importId } = req.params;
    const progress = importProgressMap.get(importId);

    if (!progress) {
        return res.status(200).json({ status: 'not_found', current: 0, total: 0 });
    }

    res.status(200).json(progress);
};

const parseMaterialList = (text) => {
    if (!text) return [];

    if (typeof text === 'string' && (text.trim().startsWith('[') || text.trim().startsWith('{'))) {
        try { return JSON.parse(text); } catch (e) { }
    }

    if (typeof text === 'object') return text;

    return text.toString().split(',').map(item => {
        item = item.trim();
        const match = item.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
            return { name: match[1].trim(), count: match[2].trim() };
        }
        return { name: item, count: "1" };
    });
};

const getCellVal = (row, idx) => {
    const val = row.getCell(idx).value;
    if (val && typeof val === 'object') {
        if (val.text) return val.text;
        if (val.result) return val.result;
    }
    return val ? val.toString().trim() : null;
};

exports.importPurchaseExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload an Excel file" });
        }
        const importId = req.query.importId || req.body.importId;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.getWorksheet(1);

        const purchasesToCreate = [];
        const errors = [];
        const rowCount = worksheet.rowCount;
        const totalRows = rowCount > 1 ? rowCount - 1 : 0;

        if (importId) {
            importProgressMap.set(importId, { status: 'processing', current: 0, total: totalRows });
        }

        let currentMaxId = await PurchaseBill.max('purchase_id') || 0;
        for (let i = 2; i <= rowCount; i++) {
            const row = worksheet.getRow(i);
            if (importId) {
                importProgressMap.set(importId, { status: 'processing', current: i - 1, total: totalRows });
            }

            if (!row.getCell(2).value && !row.getCell(3).value) continue;

            try {

                let purchase_date = row.getCell(2).value;
                if (purchase_date && typeof purchase_date === 'object') {
                    purchase_date = new Date(purchase_date).toISOString().split('T')[0];
                }

                const customer_name = getCellVal(row, 3);

                const loan_reference = getCellVal(row, 4);

                let status = getCellVal(row, 5);
                if (!['In Stock', 'Sold'].includes(status)) status = 'In Stock';

                const material_type = getCellVal(row, 6) || 'Gold';

                const itemsRaw = getCellVal(row, 7);
                const material_list = parseMaterialList(itemsRaw);
                const weight_in_grams = parseFloat(getCellVal(row, 8)) || 0;

                const grade = getCellVal(row, 9) || '22K';
                const seal = getCellVal(row, 10) || '916';

                const value_per_gram = parseFloat(getCellVal(row, 11)) || 0;

                const total_purchase_amt = parseFloat(getCellVal(row, 12)) || 0;

                let secure_location = getCellVal(row, 13);
                if (!['Bank', 'Personal'].includes(secure_location)) secure_location = 'Bank';

                const note = getCellVal(row, 14);
                let sales_date = null, sold_to = null, sales_amount = 0, profit = 0;
                if (status === 'Sold') {
                    sales_date = row.getCell(15).value;
                    if (sales_date && typeof sales_date === 'object') {
                        sales_date = new Date(sales_date).toISOString().split('T')[0];
                    }
                    sold_to = getCellVal(row, 16);
                    sales_amount = parseFloat(getCellVal(row, 17)) || 0;
                    profit = parseFloat(getCellVal(row, 18)) || 0;
                }

                if (!customer_name || !weight_in_grams || !total_purchase_amt) {
                    throw new Error("Missing required fields (Customer, Weight, or Amount)");
                }
                currentMaxId++;
                const newId = currentMaxId;

                purchasesToCreate.push({
                    purchase_id: newId,
                    purchase_date,
                    customer_name,
                    loan_reference,
                    status,
                    material_type,
                    material_list,
                    weight_in_grams,
                    grade,
                    seal,
                    value_per_gram,
                    total_purchase_amt,
                    secure_location,
                    note,
                    sales_date,
                    sold_to,
                    sales_amount,
                    profit
                });

            } catch (err) {
                errors.push(`Row ${i}: ${err.message}`);
            }
        }

        if (purchasesToCreate.length > 0) {
            await PurchaseBill.bulkCreate(purchasesToCreate);
        }
        if (importId) {
            importProgressMap.set(importId, { status: 'completed', current: totalRows, total: totalRows });
            setTimeout(() => {
                importProgressMap.delete(importId);
            }, 60000);
        }

        res.status(200).json({
            success: true,
            message: `Imported ${purchasesToCreate.length} purchase records successfully.`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ success: false, message: "Import Failed", error: error.message });
    }
};