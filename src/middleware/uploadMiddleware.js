const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];

    const isGenericMime = file.mimetype === 'application/octet-stream' || file.mimetype === 'text/plain';

    const isMimeValid = validMimes.includes(file.mimetype) || isGenericMime;

    if (extname && isMimeValid) {
        return cb(null, true);
    } else {
        cb(new Error(`Invalid file type! Allowed: .jpg, .jpeg, .png, .webp (Got: ${file.mimetype})`));
    }
}

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});
const compressImage = async (req, res, next) => {
    if (!req.file) return next();

    try {
        const filename = `temp-${Date.now()}.jpg`;
        const filepath = path.join(uploadDir, filename);

        await sharp(req.file.buffer)
            .resize({ width: 800, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(filepath);

        req.file.destination = uploadDir;
        req.file.path = filepath;
        req.file.filename = filename;

        next();
    } catch (error) {
        console.error("Image compression error:", error);
        next(new Error("Failed to compress image"));
    }
};

module.exports = { upload, compressImage };