const express = require('express');
const router = express.Router();
const rateController = require('../controllers/rateController');
const authenticateAdmin = require('../middleware/authMiddleware');

router.get('/getRate', rateController.getRates);
router.put('/update', authenticateAdmin, rateController.updateRates);

module.exports = router;