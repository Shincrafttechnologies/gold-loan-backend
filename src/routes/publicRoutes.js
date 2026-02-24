const express = require('express');
const router = express.Router();
const publicBillController = require('../controllers/publicBillController');

router.get('/get-bill-data', publicBillController.getLoanDetails);

module.exports = router;