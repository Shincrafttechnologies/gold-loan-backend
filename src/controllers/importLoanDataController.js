const { Loan, Customer, RunningBill, BillSettings, Trigger, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
require('dotenv').config();

const importProgressMap = new Map();
exports.getImportProgress = (req, res) => {
    const { importId } = req.params;
    const progress = importProgressMap.get(importId);

    if (!progress) {
        return res.status(200).json({ status: 'not_found', current: 0, total: 0 });
    }

    res.status(200).json(progress);
};
const parseFormat = (formatConfig, defaultPrefix) => {
    const match = (formatConfig || '').match(/^([a-zA-Z]*)(0+)$/);
    if (match) return { prefix: match[1], padLength: match[2].length };
    return { prefix: defaultPrefix, padLength: 4 };
};

exports.importLoanExcel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Please upload an Excel file" });

        const importId = req.query.importId || req.body.importId;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);

        const worksheet = workbook.getWorksheet(1);
        const importedLoans = [];
        const errors = [];
        const totalRows = worksheet.rowCount > 1 ? worksheet.rowCount - 1 : 0;

        if (importId) {
            importProgressMap.set(importId, { status: 'processing', current: 0, total: totalRows });
        }

        const runningSettings = await BillSettings.findOne({ where: { type: 'Running' } });
        const personalSettings = await BillSettings.findOne({ where: { type: 'Personal' } });

        const runningLimit = runningSettings ? runningSettings.max_limit : 10000;
        const personalLimit = personalSettings ? personalSettings.max_limit : 10000;

        const runningFormat = runningSettings ? runningSettings.current_series : 'A0000';
        const personalFormat = personalSettings ? personalSettings.current_series : 'N0000';

        const { prefix: runningPrefix, padLength: runningPad } = parseFormat(runningFormat, 'A');
        const { prefix: personalPrefix, padLength: personalPad } = parseFormat(personalFormat, 'N');

        let lastRunningLoan;
        if (runningPrefix === "") {
            lastRunningLoan = await Loan.findOne({
                where: sequelize.where(
                    sequelize.fn('lower', sequelize.col('loan_id')),
                    sequelize.fn('upper', sequelize.col('loan_id'))
                ),
                order: [['createdAt', 'DESC']],
                attributes: ['loan_id']
            });
        } else {
            lastRunningLoan = await Loan.findOne({
                where: { loan_id: { [Op.like]: `${runningPrefix}%` } },
                order: [['createdAt', 'DESC']],
                attributes: ['loan_id']
            });
        }

        const lastPersonalLoan = await Loan.findOne({
            where: { loan_id: { [Op.like]: `${personalPrefix}%` } },
            order: [['createdAt', 'DESC']],
            attributes: ['loan_id']
        });

        let nextRunningNum = 1;
        if (lastRunningLoan) {
            const parsed = parseInt(lastRunningLoan.loan_id.substring(runningPrefix.length));
            if (!isNaN(parsed)) nextRunningNum = parsed + 1;
        }

        let nextPersonalNum = 1;
        if (lastPersonalLoan) {
            const parsed = parseInt(lastPersonalLoan.loan_id.substring(personalPrefix.length));
            if (!isNaN(parsed)) nextPersonalNum = parsed + 1;
        }

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            if (importId) {
                importProgressMap.set(importId, { status: 'processing', current: rowNumber - 1, total: totalRows });
            }
            if (!row.getCell(2).value) continue;

            try {
                const rawBillType = getCellVal(row, 30);
                const billType = (rawBillType && rawBillType.trim()) || 'Personal';

                let newGeneratedLoanId;

                if (billType === 'Running') {
                    if (nextRunningNum > runningLimit) throw new Error(`Running Series Limit Reached (${runningLimit}).`);
                    const paddedNum = String(nextRunningNum).padStart(runningPad, '0');
                    newGeneratedLoanId = `${runningPrefix}${paddedNum}`;
                    nextRunningNum++;
                } else {
                    if (nextPersonalNum > personalLimit) throw new Error(`Personal Series Limit Reached (${personalLimit}).`);
                    const paddedNum = String(nextPersonalNum).padStart(personalPad, '0');
                    newGeneratedLoanId = `${personalPrefix}${paddedNum}`;
                    nextPersonalNum++;
                }

                const loanData = {
                    customer_id: getCellVal(row, 2),
                    customer_name: getCellVal(row, 3),
                    phone_no: getCellVal(row, 4),
                    relation_type: getCellVal(row, 5),
                    relative_name: getCellVal(row, 6),
                    street: getCellVal(row, 7),
                    area: getCellVal(row, 8),
                    state: getCellVal(row, 9),
                    pincode: getCellVal(row, 10),
                    status: getCellVal(row, 11) || 'Open',
                    loan_opening_date: parseDate(getCellVal(row, 12)),
                    loan_closing_date: parseDate(getCellVal(row, 13)),
                    material_type: getCellVal(row, 14),
                    total_weight: parseFloat(getCellVal(row, 15)) || 0,
                    value_per_gram: parseFloat(getCellVal(row, 16)) || 0,
                    material_list_str: getCellVal(row, 17),
                    item_photo_url: null,
                    total_amount: parseFloat(getCellVal(row, 19)) || 0,
                    present_value: parseFloat(getCellVal(row, 20)) || 0,
                    processing_fee: parseFloat(getCellVal(row, 21)) || 0,
                    interest_str: getCellVal(row, 22),
                    pending_amount: parseFloat(getCellVal(row, 23)) || 0,
                    closing_amount: parseFloat(getCellVal(row, 24)) || 0,
                    profit_amount: parseFloat(getCellVal(row, 25)) || 0,
                    prediction_closing_amount: parseFloat(getCellVal(row, 26)) || 0,
                    partial_payment_str: getCellVal(row, 27),
                    loan_duration_months: parseInt(getCellVal(row, 28)) || 0,
                    loan_duration_days: parseInt(getCellVal(row, 29)) || 0,
                    bill_type: billType, // Mapped above (Col 30)
                    secure_location: getCellVal(row, 31) || 'Locker',
                    location_details: getCellVal(row, 32) || '',
                    alert_count: parseInt(getCellVal(row, 33)) || 0,
                    remark: getCellVal(row, 34) || ''
                };

                let customer = await Customer.findOne({ where: { customer_id: loanData.customer_id } });
                if (!customer) {
                    customer = await Customer.create({
                        customer_id: loanData.customer_id,
                        name: loanData.customer_name,
                        phone_no: loanData.phone_no,
                        relation_type: loanData.relation_type,
                        relative_name: loanData.relative_name,
                        street: loanData.street,
                        area: loanData.area,
                        state: loanData.state,
                        pincode: loanData.pincode,
                        open_loan_cnt: 1,
                        total_loan_cnt: 1
                    });
                } else {
                    await customer.increment(['open_loan_cnt', 'total_loan_cnt']);
                }

                let materialList = [];
                if (loanData.material_list_str) {
                    const lines = loanData.material_list_str.split('\n');
                    materialList = lines.map(line => {
                        const match = line.match(/(.*)\s\((\d+)\)\s-\s(.*)/);
                        return match ? { name: match[1].trim(), count: match[2], weight_per_item: match[3] }
                            : { name: line, count: 1, weight_per_item: '0g' };
                    });
                }

                let partialPayments = [];
                if (loanData.partial_payment_str && loanData.partial_payment_str !== 'No Payments') {
                    const lines = loanData.partial_payment_str.split('\n');
                    partialPayments = lines.map(line => {
                        const parts = line.split(/[:|,]/);
                        return {
                            date: parts[0]?.trim() || '',
                            interest: parseFloat(line.match(/Int\s(\d+(\.\d+)?)/)?.[1]) || 0,
                            principal: parseFloat(line.match(/Prin\s(\d+(\.\d+)?)/)?.[1]) || 0
                        };
                    });
                }

                let interestArr = [];
                if (loanData.interest_str) {
                    interestArr = loanData.interest_str.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                }

                const newLoan = await Loan.create({
                    loan_id: newGeneratedLoanId,
                    customer_id: customer.customer_id,
                    customer_name: loanData.customer_name,
                    phone_no: loanData.phone_no,
                    relation_type: loanData.relation_type,
                    relative_name: loanData.relative_name,
                    street: loanData.street,
                    area: loanData.area,
                    state: loanData.state,
                    pincode: loanData.pincode,
                    status: loanData.status,
                    loan_opening_date: loanData.loan_opening_date,
                    loan_closing_date: loanData.loan_closing_date,
                    material_type: loanData.material_type,
                    total_weight: loanData.total_weight,
                    material_list: materialList,
                    item_photo_url: loanData.item_photo_url,
                    total_amount: loanData.total_amount,
                    present_value: loanData.present_value,
                    processing_fee: loanData.processing_fee,
                    interest: interestArr,
                    pending_amount: loanData.pending_amount,
                    closing_amount: loanData.closing_amount,
                    profit_amount: loanData.profit_amount,
                    prediction_closing_amount: loanData.prediction_closing_amount,
                    partial_payment: partialPayments,
                    loan_duration_months: loanData.loan_duration_months,
                    loan_duration_days: loanData.loan_duration_days,
                    bill_type: loanData.bill_type,
                    secure_location: loanData.secure_location,
                    location_details: loanData.location_details,
                    alert_count: loanData.alert_count,
                    remark: loanData.remark
                });

                importedLoans.push(newLoan.loan_id);

                if (loanData.bill_type === 'Running') {
                    const principal = parseFloat(loanData.total_amount) || 0;
                    const durationMonths = parseInt(loanData.loan_duration_months) || 0;
                    const shadowInterestRate = 0.01;
                    const shadowProfit = principal * shadowInterestRate * durationMonths;
                    const shadowPrediction = principal + shadowProfit;

                    await RunningBill.create({
                        ...newLoan.toJSON(),
                        interest: [shadowInterestRate],
                        profit_amount: shadowProfit,
                        prediction_closing_amount: shadowPrediction,
                        loan_id: newLoan.loan_id
                    });
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let dueDate = null;
                if (newLoan.loan_opening_date && newLoan.loan_duration_days) {
                    const d = new Date(newLoan.loan_opening_date);
                    d.setDate(d.getDate() + newLoan.loan_duration_days);
                    dueDate = d;
                }

                if (newLoanTrigger && newLoan.status === 'Open') {
                    let rawMsg = newLoanTrigger.message_format;
                    let finalMsg = rawMsg
                        .replace(/{NAME}/g, newLoan.customer_name)
                        .replace(/{LOAN_ID}/g, newLoan.loan_id)
                        .replace(/{AMOUNT}/g, newLoan.total_amount)
                        .replace(/{DATE}/g, dueDate ? dueDate.toLocaleDateString() : 'N/A');

                    await Notification.create({
                        loan_id: newLoan.loan_id,
                        customer_name: newLoan.customer_name,
                        phone_no: newLoan.phone_no,
                        type: 'NewLoan',
                        days_diff: 0,
                        message: finalMsg,
                        whatsapp_link: `https://wa.me/${newLoan.phone_no}?text=${encodeURIComponent(finalMsg)}`,
                        is_active: true
                    });
                }

                if (dueDate && newLoan.status === 'Open') {
                    const dDate = new Date(dueDate);
                    dDate.setHours(0, 0, 0, 0);
                    const diffTime = dDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    let notifType = null;
                    let notifConfig = null;

                    if (alertTrigger) {
                        const threshold = alertTrigger.trigger_days || 4;
                        if (diffDays <= threshold && diffDays >= 0) {
                            notifType = 'Alert';
                            notifConfig = alertTrigger;
                        }
                    }

                    if (!notifType && warningTrigger) {
                        const threshold = warningTrigger.trigger_days || 4;
                        if (diffDays < 0 && diffDays <= -threshold) {
                            notifType = 'Warning';
                            notifConfig = warningTrigger;
                        }
                    }

                    if (notifType && notifConfig) {
                        let rawMsg = notifConfig.message_format;
                        let finalMsg = rawMsg
                            .replace(/{NAME}/g, newLoan.customer_name)
                            .replace(/{LOAN_ID}/g, newLoan.loan_id)
                            .replace(/{AMOUNT}/g, newLoan.total_amount)
                            .replace(/{DATE}/g, dueDate.toLocaleDateString())
                            .replace(/{DAYS}/g, Math.abs(diffDays));

                        await Notification.create({
                            loan_id: newLoan.loan_id,
                            customer_name: newLoan.customer_name,
                            phone_no: newLoan.phone_no,
                            type: notifType,
                            days_diff: Math.abs(diffDays),
                            message: finalMsg,
                            whatsapp_link: `https://wa.me/${newLoan.phone_no}?text=${encodeURIComponent(finalMsg)}`,
                            is_active: true
                        });
                    }
                }

            } catch (err) {
                console.error(`Error row ${rowNumber}:`, err);
                errors.push(`Row ${rowNumber}: ${err.message}`);
            }
        }
        if (importId) {
            importProgressMap.set(importId, { status: 'completed', current: totalRows, total: totalRows });
            setTimeout(() => {
                importProgressMap.delete(importId);
            }, 60000);
        }

        res.status(200).json({
            success: true,
            message: `Import complete. Added ${importedLoans.length} loans.`,
            imported_ids: importedLoans,
            errors: errors
        });

    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ success: false, message: "Failed to import Excel", error: error.message });
    }
};

const getCellVal = (row, idx) => {
    const val = row.getCell(idx).value;
    if (val && typeof val === 'object' && val.text) return val.text;
    return val ? val.toString().trim() : null;
};

const parseDate = (val) => {
    if (!val) return null;

    if (val instanceof Date && !isNaN(val.getTime())) {
        return val;
    }

    const str = val.toString().trim();

    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];

            const formattedDate = new Date(`${year}-${month}-${day}T00:00:00`);
            if (!isNaN(formattedDate.getTime())) return formattedDate;
        }
    }

    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return d;
};