const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const logoController = require('../controllers/logoController');
const authenticateAdmin = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'assets/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const dir = 'assets/';

        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            files.forEach(existingFile => {
                if (existingFile.startsWith('logo.')) {
                    fs.unlinkSync(path.join(dir, existingFile));
                }
            });
        }

        const ext = path.extname(file.originalname);
        cb(null, `logo${ext}`);
    }
});

const upload = multer({ storage: storage });

router.get('/get_logo', authenticateAdmin, logoController.getLogo);
router.put('/update_logo', authenticateAdmin, upload.single('logo_image'), logoController.updateLogo);

module.exports = router;