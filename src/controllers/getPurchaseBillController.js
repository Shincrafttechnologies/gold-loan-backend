const { PurchaseBill } = require('../models');
const { Op } = require('sequelize');

exports.getAllPurchaseBills = async (req, res) => {
    try {
        const {
            purchase_id,
            start_date,
            end_date,
            customer_name,
            sort_order,
            sort_by,
            page = 1,
            limit = 10
        } = req.query;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const whereClause = {};

        if (customer_name) {
            whereClause.customer_name = { [Op.iLike]: `%${customer_name}%` };
        }

        if (purchase_id) {
            whereClause.purchase_id = purchase_id;
        }

        if (start_date || end_date) {
            whereClause.purchase_date = {};

            if (start_date) {
                whereClause.purchase_date[Op.gte] = start_date;
            }
            if (end_date) {
                whereClause.purchase_date[Op.lte] = end_date;
            }
        }

        const sortByField = sort_by || 'createdAt';
        const sortDirection = sort_order === 'ASC' ? 'ASC' : 'DESC';

        const { count, rows } = await PurchaseBill.findAndCountAll({
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
            bills: rows
        });

    } catch (error) {
        console.error("Error fetching purchase bills:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch purchase bills",
            error: error.message
        });
    }
};