const { Customer, Loan } = require('../models');

exports.deleteCustomer = async (req, res) => {
    try {
        const { customer_id } = req.params;

        const customer = await Customer.findOne({ where: { customer_id } });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const activeLoanCount = await Loan.count({
            where: {
                customer_id: customer_id,
                status: 'Open'
            }
        });

        if (activeLoanCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete customer! They still have ${activeLoanCount} Open loans. Please close them first.`
            });
        }

        await customer.destroy();

        res.status(200).json({
            success: true,
            message: `Customer ${customer_id} deleted. Loan history has been preserved.`
        });

    } catch (error) {
        console.error("Error deleting customer:", error);

        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(409).json({
                success: false,
                message: "Database Constraint Error: Cannot delete this customer because they have linked loan records. Please update your database constraints."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to delete customer",
            error: error.message
        });
    }
};