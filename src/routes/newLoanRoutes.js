const express = require('express');
const router = express.Router();
const multer = require('multer');

const newLoanController = require('../controllers/newLoanController');
const getLoanController = require('../controllers/getLoansController');
const deleteLoanController = require('../controllers/deleteLoanController');
const editLoanController = require('../controllers/editLoanController');
const downloadLoanController = require('../controllers/downloadLoanDataController');
const importLoanController = require('../controllers/importLoanDataController');
const billSettingController = require('../controllers/billSettingController');
const whatsappController = require('../controllers/whatsappController');
const getLoanByIdController = require('../controllers/getLoanByIdController');

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

router.get('/import-progress/:importId', authenticateAdmin, importLoanController.getImportProgress);
router.get('/generate-id', authenticateAdmin, newLoanController.getNewCustomerId);
router.get('/all', authenticateAdmin, getLoanController.getAllLoans);
router.delete('/delete/:loan_id', authenticateAdmin, deleteLoanController.deleteLoanById);
router.put('/edit/:loan_id', authenticateAdmin, handleImageUpload, compressImage, editLoanController.editLoan);
router.post('/next_loan_id', authenticateAdmin, newLoanController.getNextLoanId);
router.get('/download-loan-excel', authenticateAdmin, downloadLoanController.downloadLoanExcel);
router.post('/import-excel', authenticateAdmin, excelUpload.single('file'), importLoanController.importLoanExcel);
router.get('/settings/series', authenticateAdmin, billSettingController.getBillSettings);
router.put('/settings/series/update', authenticateAdmin, billSettingController.updateBillSeries);
router.post('/generate-whatsapp-link', authenticateAdmin, whatsappController.generateWhatsappBillLink);
router.get('/loan/:loan_id', authenticateAdmin, getLoanByIdController.getLoanById);

// 'item_photo' must match the field name sent from Frontend FormData
router.post('/create', authenticateAdmin, handleImageUpload, compressImage, newLoanController.createLoanBill);

module.exports = router;