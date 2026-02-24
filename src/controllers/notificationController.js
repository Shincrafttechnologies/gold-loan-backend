const { Trigger, Notification } = require('../models');
const { refreshNotifications } = require('../services/notificationService');

exports.getTriggerSettings = async (req, res) => {
    try {
        const triggers = await Trigger.findAll();
        res.status(200).json({ success: true, triggers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateTriggerSettings = async (req, res) => {
    try {
        const { alert, warning, newLoan } = req.body;

        const updateTrigger = async (type, payload) => {
            if (!payload) return null;

            const updates = {};
            if (payload.trigger_days !== undefined) updates.trigger_days = payload.trigger_days;
            if (payload.message_format !== undefined) updates.message_format = payload.message_format;

            if (Object.keys(updates).length > 0) {
                return Trigger.update(updates, { where: { type } });
            }
            return null;
        };

        await Promise.all([
            updateTrigger('Alert', alert),
            updateTrigger('Warning', warning),
            updateTrigger('NewLoan', newLoan)
        ]);

        await refreshNotifications();

        const updatedTriggers = await Trigger.findAll();

        res.status(200).json({
            success: true,
            message: "Trigger settings updated successfully",
            triggers: updatedTriggers
        });

    } catch (error) {
        console.error("Error updating trigger settings:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications
        });

    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};