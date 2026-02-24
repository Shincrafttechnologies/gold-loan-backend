const express = require('express');
const router = express.Router();
const multer = require('multer');
const createCustomerController = require('../controllers/createCustomerController');
const editCustomerController = require('../controllers/editCustomerController');
const deleteCustomerController = require('../controllers/deleteCustomerController');
const getCustomerController = require('../controllers/getCustomerController');
const exportCustomerController = require('../controllers/exportCustomerController');
const importCustomerController = require('../controllers/importCustomerController');

const authenticateAdmin = require('../middleware/authMiddleware');
const { upload, compressImage } = require('../middleware/uploadMiddleware');

const excelUpload = multer({ storage: multer.memoryStorage() });
const handleImageUpload = (req, res, next) => {
    const uploadSingle = upload.single('item_photo');

    uploadSingle(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        next();
    });
};

router.get('/import-progress/:importId', authenticateAdmin, importCustomerController.getImportProgress);
router.post('/add', authenticateAdmin, handleImageUpload, compressImage, createCustomerController.createCustomer);
router.put('/edit/:customer_id', authenticateAdmin, handleImageUpload, compressImage, editCustomerController.editCustomer);
router.delete('/delete/:customer_id', authenticateAdmin, deleteCustomerController.deleteCustomer);
router.get('/all', authenticateAdmin, getCustomerController.getAllCustomers);
router.get('/export', authenticateAdmin, exportCustomerController.downloadCustomersExcel);
router.post('/import', authenticateAdmin, excelUpload.single('file'), importCustomerController.importCustomerExcel);

module.exports = router;