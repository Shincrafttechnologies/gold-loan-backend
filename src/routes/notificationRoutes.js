const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticateAdmin = require('../middleware/authMiddleware');


router.get('/settings', authenticateAdmin, notificationController.getTriggerSettings);

router.post('/settings/update', authenticateAdmin, notificationController.updateTriggerSettings);

router.get('/list', authenticateAdmin, notificationController.getNotifications);

module.exports = router;