const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../../assets');

if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}


exports.getLogo = (req, res) => {
    try {
        const files = fs.readdirSync(assetsDir);
        const logoFile = files.find(file => file.startsWith('logo.'));

        if (!logoFile) {
            return res.status(404).json({ success: false, message: "No logo found" });
        }

        const filePath = path.join(assetsDir, logoFile);
        res.sendFile(filePath);

    } catch (error) {
        console.error("Error getting logo:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve logo" });
    }
};

exports.updateLogo = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload an image file" });
        }

        res.status(200).json({
            success: true,
            message: "Logo updated successfully",
            filePath: `assets/${req.file.filename}`
        });

    } catch (error) {
        console.error("Error updating logo:", error);
        res.status(500).json({ success: false, message: "Failed to update logo" });
    }
};