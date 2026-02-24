const { Loan, RunningBill } = require('../models'); // <--- Import RunningBill
const { Op } = require('sequelize');

exports.getAllLoans = async (req, res) => {
    try {
        const {
            super_vision,
            status,
            loan_id,
            bill_type,
            secure_location,
            relation_type,
            customer_id,

            min_amount,
            max_amount,
            min_weight,
            max_weight,

            start_date,
            end_date,

            sort_order,
            sort_by,
            page = 1,
            limit = 10
        } = req.query;

        const TargetModel = (super_vision === 'on') ? RunningBill : Loan;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const whereClause = {};

        if (status) whereClause.status = status;
        if (bill_type) whereClause.bill_type = bill_type;
        if (secure_location) whereClause.secure_location = secure_location;
        if (relation_type) whereClause.relation_type = relation_type;
        if (loan_id) whereClause.loan_id = loan_id;
        if (customer_id) whereClause.customer_id = customer_id;

        if (min_amount || max_amount) {
            whereClause.total_amount = {};
            if (min_amount) whereClause.total_amount[Op.gte] = parseFloat(min_amount);
            if (max_amount) whereClause.total_amount[Op.lte] = parseFloat(max_amount);
        }

        if (min_weight || max_weight) {
            whereClause.total_weight = {};
            if (min_weight) whereClause.total_weight[Op.gte] = parseFloat(min_weight);
            if (max_weight) whereClause.total_weight[Op.lte] = parseFloat(max_weight);
        }

        if (start_date || end_date) {
            whereClause.loan_opening_date = {};
            if (start_date) whereClause.loan_opening_date[Op.gte] = start_date;
            if (end_date) whereClause.loan_opening_date[Op.lte] = end_date;
        }

        const sortByField = sort_by || 'createdAt';
        const sortDirection = sort_order === 'ASC' ? 'ASC' : 'DESC';

        const { count, rows } = await TargetModel.findAndCountAll({
            where: whereClause,
            order: [[sortByField, sortDirection]],
            limit: limitNum,
            offset: offset,
        });

        const totalPages = Math.ceil(count / limitNum);

        res.status(200).json({
            success: true,
            data_source: (super_vision === 'on') ? 'Shadow Accounting (RunningBill)' : 'Main Database (Loan)',
            pagination: {
                total_items: count,
                total_pages: totalPages,
                current_page: pageNum,
                items_per_page: limitNum,
                has_next_page: pageNum < totalPages,
                has_prev_page: pageNum > 1
            },
            loans: rows
        });

    } catch (error) {
        console.error("Error fetching loans:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch loans",
            error: error.message
        });
    }
};