const { Rate } = require('../models');


exports.updateRates = async (req, res) => {
    try {
        const { gold_rate_per_gram, silver_rate_per_gram } = req.body;

        let rateRecord = await Rate.findOne();

        if (!rateRecord) {
            rateRecord = await Rate.create({
                gold_rate_per_gram: gold_rate_per_gram || 0,
                silver_rate_per_gram: silver_rate_per_gram || 0
            });
        } else {
            if (gold_rate_per_gram !== undefined) {
                rateRecord.gold_rate_per_gram = parseFloat(gold_rate_per_gram);
            }

            if (silver_rate_per_gram !== undefined) {
                rateRecord.silver_rate_per_gram = parseFloat(silver_rate_per_gram);
            }

            await rateRecord.save();
        }

        res.status(200).json({
            success: true,
            message: "Rates updated successfully",
            rates: rateRecord
        });

    } catch (error) {
        console.error("Error updating rates:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update rates",
            error: error.message
        });
    }
};

exports.getRates = async (req, res) => {
    try {
        let rateRecord = await Rate.findOne();

        if (!rateRecord) {
            rateRecord = { gold_rate_per_gram: 0, silver_rate_per_gram: 0 };
        }

        res.status(200).json({
            success: true,
            rates: rateRecord
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching rates" });
    }
};