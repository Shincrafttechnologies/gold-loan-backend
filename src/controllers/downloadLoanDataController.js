const { Loan, RunningBill } = require('../models');
const ExcelJS = require('exceljs');

exports.downloadLoanExcel = async (req, res) => {
    try {
        const { super_vision } = req.query;

        const TargetModel = (super_vision === 'on') ? RunningBill : Loan;

        const loans = await TargetModel.findAll({
            order: [['createdAt', 'DESC']],
            raw: true
        });

        const workbook = new ExcelJS.Workbook();

        const sheetName = (super_vision === 'on') ? 'Running Bills Data' : 'All Loan Data';
        const worksheet = workbook.addWorksheet(sheetName);

        worksheet.columns = [
            // --- ID & Personal Info ---
            { header: 'Loan ID', key: 'loan_id', width: 12 },
            { header: 'Cust ID', key: 'customer_id', width: 10 },
            { header: 'Name', key: 'customer_name', width: 20 },
            { header: 'Phone', key: 'phone_no', width: 15 },
            { header: 'Relation', key: 'relation_type', width: 10 },
            { header: 'Rel Name', key: 'relative_name', width: 15 },

            // --- Address ---
            { header: 'Street', key: 'street', width: 20 },
            { header: 'Area', key: 'area', width: 15 },
            { header: 'State', key: 'state', width: 15 },
            { header: 'Pincode', key: 'pincode', width: 10 },

            // --- Loan Status & Dates ---
            { header: 'Status', key: 'status', width: 10 },
            { header: 'Opened Date', key: 'loan_opening_date', width: 15 },
            { header: 'Closed Date', key: 'loan_closing_date', width: 15 },

            // --- Material Info ---
            { header: 'Material Type', key: 'material_type', width: 12 },
            { header: 'Total Weight', key: 'total_weight', width: 12 },
            { header: 'Value/Gram', key: 'value_per_gram', width: 12 },
            {
                header: 'Material List',
                key: 'material_list_str',
                width: 35,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },
            { header: 'Photo URL', key: 'item_photo_url', width: 30 },

            // --- Financials (Main) ---
            { header: 'Total Loan Amt', key: 'total_amount', width: 15 },
            { header: 'Present Value', key: 'present_value', width: 15 },
            { header: 'Processing Fee', key: 'processing_fee', width: 15 },
            { header: 'Interest Rates', key: 'interest_str', width: 20 },

            // --- Financials (Closing/Pending) ---
            { header: 'Pending Amt', key: 'pending_amount', width: 15 },
            { header: 'Closing Amt', key: 'closing_amount', width: 15 },
            { header: 'Profit', key: 'profit_amount', width: 15 },
            { header: 'Pred. Closing', key: 'prediction_closing_amount', width: 15 },

            // --- Partial Payments ---
            {
                header: 'Partial Payments',
                key: 'partial_payment_str',
                width: 40,
                style: { alignment: { wrapText: true, vertical: 'top' } }
            },

            // --- Duration/Time ---
            { header: 'Loan Dur (Months)', key: 'loan_duration_months', width: 18 },
            { header: 'Loan Dur (Days)', key: 'loan_duration_days', width: 18 },

            // --- Other Details ---
            { header: 'Bill Type', key: 'bill_type', width: 12 },
            { header: 'Secure Loc', key: 'secure_location', width: 12 },
            { header: 'Loc Details', key: 'location_details', width: 20 },
            { header: 'Alert Count', key: 'alert_count', width: 12 },
            { header: 'Remark', key: 'remark', width: 25 },
        ];


        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };


        loans.forEach(loan => {

            let partialStr = '';
            let payments = loan.partial_payment;
            if (typeof payments === 'string') try { payments = JSON.parse(payments); } catch (e) { payments = []; }

            if (Array.isArray(payments) && payments.length > 0) {
                partialStr = payments.map(p => {
                    const d = p.date || '-';
                    const i = p.interest || 0;
                    const pr = p.principal || 0;
                    return `${d}: Int ${i}, Prin ${pr}`;
                }).join('\n');
            } else {
                partialStr = 'No Payments';
            }


            let materialStr = '';
            let materials = loan.material_list;
            if (typeof materials === 'string') try { materials = JSON.parse(materials); } catch (e) { materials = []; }

            if (Array.isArray(materials)) {
                materialStr = materials.map(m =>
                    `${m.name} (${m.count}) - ${m.weight_per_item}`
                ).join('\n');
            }


            let interestStr = '';
            let interestRaw = loan.interest;
            if (typeof interestRaw === 'string') {
                interestStr = interestRaw.replace(/[\[\]"]/g, '');
            } else if (Array.isArray(interestRaw)) {
                interestStr = interestRaw.join(', ');
            }

            const openDate = loan.loan_opening_date ? new Date(loan.loan_opening_date).toLocaleDateString('en-GB') : '';
            const closeDate = loan.loan_closing_date ? new Date(loan.loan_closing_date).toLocaleDateString('en-GB') : '';

            worksheet.addRow({
                ...loan,
                material_list_str: materialStr,
                interest_str: interestStr,
                partial_payment_str: partialStr,
                loan_opening_date: openDate,
                loan_closing_date: closeDate
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        const filePrefix = (super_vision === 'on') ? 'RunningBills_Export' : 'Loans_Export';
        res.setHeader('Content-Disposition', `attachment; filename=${filePrefix}_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error downloading excel:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};