const { Customer } = require('../models');
const { Op } = require('sequelize');


exports.getAllCustomers = async (req, res) => {
    try {
        const {
            customer_id,
            name,

            sort_order,
            sort_by,

            page = 1,
            limit = 10
        } = req.query;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;
        const whereClause = {};

        if (name) {
            whereClause.name = { [Op.iLike]: `%${name}%` };
        }
        if (customer_id) {
            whereClause.customer_id = customer_id;
        }

        const sortByField = sort_by || 'createdAt';
        const sortDirection = sort_order === 'ASC' ? 'ASC' : 'DESC';

        const { count, rows } = await Customer.findAndCountAll({
            where: whereClause,
            order: [[sortByField, sortDirection]],
            limit: limitNum,
            offset: offset,
        });

        const totalPages = Math.ceil(count / limitNum);

        res.status(200).json({
            success: true,
            pagination: {
                total_items: count,
                total_pages: totalPages,
                current_page: pageNum,
                items_per_page: limitNum,
                has_next_page: pageNum < totalPages,
                has_prev_page: pageNum > 1
            },
            customers: rows
        });

    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch customers",
            error: error.message
        });
    }
};