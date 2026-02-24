const { BillSettings, Loan, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getBillSettings = async (req, res) => {
    try {
        const settings = await BillSettings.findAll();
        res.status(200).json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateBillSeries = async (req, res) => {
    try {
        const { running_new_series, personal_new_series } = req.body;

        if (!running_new_series && !personal_new_series) {
            return res.status(400).json({
                success: false,
                message: "At least one series (Running or Personal) must be provided"
            });
        }

        const validateFormat = (format, requirePrefix) => {
            if (format.length > 5) return false;
            const match = format.match(/^([a-zA-Z]*)(0+)$/);
            if (!match) return false;

            const prefix = match[1];
            if (requirePrefix && prefix.length === 0) return false;
            return true;
        };

        if (running_new_series && !validateFormat(running_new_series, false)) {
            return res.status(400).json({ success: false, message: "Invalid Running series format. Use letters followed by zeros (e.g., A0000 or 0000)." });
        }

        if (personal_new_series && !validateFormat(personal_new_series, true)) {
            return res.status(400).json({ success: false, message: "Invalid Personal series format. Must start with alphabet (e.g., N0000)." });
        }


        const checkExistingPrefix = async (format) => {
            const match = format.match(/^([a-zA-Z]*)(0+)$/);
            const prefix = match[1];

            if (prefix === "") {
                return await Loan.findOne({
                    where: sequelize.where(
                        sequelize.fn('lower', sequelize.col('loan_id')),
                        sequelize.fn('upper', sequelize.col('loan_id'))
                    )
                });
            } else {
                return await Loan.findOne({
                    where: { loan_id: { [Op.like]: `${prefix}%` } }
                });
            }
        };

        if (running_new_series) {
            const conflict = await checkExistingPrefix(running_new_series);
            if (conflict) {
                return res.status(409).json({ success: false, message: `Cannot switch Running series. Loans with this prefix already exist.` });
            }
        }

        if (personal_new_series) {
            const conflict = await checkExistingPrefix(personal_new_series);
            if (conflict) {
                return res.status(409).json({ success: false, message: `Cannot switch Personal series. Loans with this prefix already exist.` });
            }
        }

        const updateSeriesSetting = async (billType, newSeries) => {
            if (!newSeries) return;
            const [setting, created] = await BillSettings.findOrCreate({
                where: { type: billType },
                defaults: { current_series: newSeries }
            });

            if (!created) {
                setting.current_series = newSeries;
                await setting.save();
            }
        };

        await Promise.all([
            updateSeriesSetting('Running', running_new_series),
            updateSeriesSetting('Personal', personal_new_series)
        ]);

        const updatedSettings = await BillSettings.findAll();
        res.status(200).json({
            success: true,
            message: "Bill series format updated successfully",
            settings: updatedSettings
        });

    } catch (error) {
        console.error("Error updating series:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};