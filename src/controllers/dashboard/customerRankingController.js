const { Customer } = require('../../models');

exports.getCustomerRankings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const offset = (page - 1) * limit;

        const { count, rows } = await Customer.findAndCountAll({
            order: [['total_closed_loan_amt', 'DESC']],
            limit: limit,
            offset: offset,
            attributes: [
                'customer_id',
                'name',
                'phone_no',
                'total_closed_loan_amt',
                'closed_loan_cnt',
                'item_photo_url'
            ]
        });

        res.status(200).json({
            success: true,
            data: {
                total_customers: count,
                total_pages: Math.ceil(count / limit),
                current_page: page,
                limit: limit,
                rankings: rows
            }
        });

    } catch (error) {
        console.error("Error fetching customer rankings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch customer rankings",
            error: error.message
        });
    }
};

exports.getCustomerStats = async (req, res) => {
    try {
        const totalCustomers = await Customer.count();

        res.status(200).json({
            success: true,
            data: {
                total_customers: totalCustomers
            }
        });

    } catch (error) {
        console.error("Error fetching customer stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch customer statistics",
            error: error.message
        });
    }
};