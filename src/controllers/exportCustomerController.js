const { Customer } = require('../models');
const ExcelJS = require('exceljs');

exports.downloadCustomersExcel = async (req, res) => {
    try {
        const customers = await Customer.findAll({
            order: [['createdAt', 'DESC']],
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Customers');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Customer ID', key: 'customer_id', width: 15 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Phone No', key: 'phone_no', width: 15 },
            { header: 'Relation', key: 'relation_type', width: 10 },
            { header: 'Relative Name', key: 'relative_name', width: 20 },
            { header: 'Street', key: 'street', width: 25 },
            { header: 'Area', key: 'area', width: 20 },
            { header: 'State', key: 'state', width: 15 },
            { header: 'Pincode', key: 'pincode', width: 10 },
            { header: 'Open Loans', key: 'open_loan_cnt', width: 12 },
            { header: 'Closed Loans', key: 'closed_loan_cnt', width: 12 },
            { header: 'Closed Loan Amt', key: 'total_closed_loan_amt', width: 20 },
            { header: 'Photo URL', key: 'item_photo_url', width: 30 }
        ];

        customers.forEach(customer => {
            worksheet.addRow({
                id: customer.id,
                customer_id: customer.customer_id,
                name: customer.name,
                phone_no: customer.phone_no,
                relation_type: customer.relation_type,
                relative_name: customer.relative_name,
                street: customer.street,
                area: customer.area,
                state: customer.state,
                pincode: customer.pincode,
                open_loan_cnt: customer.open_loan_cnt,
                closed_loan_cnt: customer.closed_loan_cnt,
                total_closed_loan_amt: customer.total_closed_loan_amt,
                item_photo_url: customer.item_photo_url || 'N/A',
            });
        });

        worksheet.getRow(1).font = { bold: true };

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'Customers_List.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ success: false, message: "Failed to download Excel", error: error.message });
    }
};