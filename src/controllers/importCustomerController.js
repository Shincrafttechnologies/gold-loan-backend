const { Customer } = require('../models');
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

const generateUniqueCustomerId = async () => {
    let unique = false;
    let newId = 0;
    let attempts = 0;
    const maxAttempts = 20;

    while (!unique && attempts < maxAttempts) {
        attempts++;
        newId = Math.floor(100000 + Math.random() * 900000);

        const existingCustomer = await Customer.findOne({
            where: { customer_id: newId },
            attributes: ['customer_id']
        });

        if (!existingCustomer) {
            unique = true;
        }
    }

    if (!unique) throw new Error("Could not generate unique Customer ID");
    return newId;
};

exports.importCustomerExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload an Excel file" });
        }
        const importId = req.query.importId || req.body.importId;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);

        const worksheet = workbook.getWorksheet(1);
        const customersToCreate = [];
        const errors = [];
        const importedNames = [];

        const rowCount = worksheet.rowCount;
        const totalRows = rowCount > 1 ? rowCount - 1 : 0;

        if (importId) {
            importProgressMap.set(importId, { status: 'processing', current: 0, total: totalRows });
        }

        for (let i = 2; i <= rowCount; i++) {
            const row = worksheet.getRow(i);
            if (importId) {
                importProgressMap.set(importId, { status: 'processing', current: i - 1, total: totalRows });
            }

            if (!row.getCell(3).value) continue;

            try {
                const name = getCellVal(row, 3);
                const phone_no = getCellVal(row, 4);
                const relation_type = getCellVal(row, 5);
                const relative_name = getCellVal(row, 6);
                const street = getCellVal(row, 7);
                const area = getCellVal(row, 8);
                const state = getCellVal(row, 9);
                const pincode = getCellVal(row, 10);

                if (!name || !phone_no || !relation_type || !relative_name) {
                    throw new Error("Missing Name, Phone, Relation, or Relative Name");
                }

                const newCustomerId = await generateUniqueCustomerId();

                customersToCreate.push({
                    customer_id: newCustomerId,
                    name,
                    phone_no: String(phone_no),
                    relation_type,
                    relative_name,
                    street: street || '',
                    area: area || '',
                    state: state || 'Puducherry',
                    pincode: String(pincode || ''),
                    open_loan_cnt: 0,
                    total_loan_cnt: 0,
                    closed_loan_cnt: 0,
                    total_closed_loan_amt: 0,
                    item_photo_url: null // Cannot import images from Excel easily
                });

                importedNames.push(`${name} (${newCustomerId})`);

            } catch (err) {
                console.error(`Row ${i} Error:`, err.message);
                errors.push(`Row ${i}: ${err.message}`);
            }
        }

        if (customersToCreate.length > 0) {
            await Customer.bulkCreate(customersToCreate);
        }
        if (importId) {
            importProgressMap.set(importId, { status: 'completed', current: totalRows, total: totalRows });
            setTimeout(() => {
                importProgressMap.delete(importId);
            }, 60000);
        }

        res.status(200).json({
            success: true,
            message: `Import Processed. Successfully added ${customersToCreate.length} customers.`,
            imported_customers: importedNames,
            errors: errors
        });

    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ success: false, message: "Failed to import Excel", error: error.message });
    }
};

const getCellVal = (row, idx) => {
    const val = row.getCell(idx).value;
    if (val && typeof val === 'object') {
        if (val.text) return val.text;
        if (val.result) return val.result;
    }
    return val ? val.toString().trim() : null;
};