const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Admin } = require('../models');
const { sendResetEmail } = require('../utils/emailService');
const { Op } = require('sequelize');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ where: { email } });
        if (!admin) return res.status(401).json({ message: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid Credentials' });

        const payload = { id: admin.id, email: admin.email };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        res.json({
            success: true,
            accessToken,
            refreshToken,
            message: 'Login Successful'
        });

    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh Token is required' });
        }

        const decoded = verifyRefreshToken(refreshToken);

        if (!decoded) {
            return res.status(403).json({ success: false, message: 'Invalid or Expired Refresh Token. Please Login again.' });
        }

        const payload = { id: decoded.id, email: decoded.email };
        const newAccessToken = generateAccessToken(payload);

        res.json({
            success: true,
            accessToken: newAccessToken
        });

    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
            return res.status(404).json({ message: 'Email not found' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 2 * 60 * 1000);

        admin.reset_token = resetToken;
        admin.reset_token_expiry = tokenExpiry;
        await admin.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        const emailSent = await sendResetEmail(email, resetLink);

        if (emailSent) {
            res.json({ success: true, message: 'Reset link sent to your email.' });
        } else {
            res.status(500).json({ message: 'Failed to send email. Try again later.' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};


const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const admin = await Admin.findOne({
            where: {
                reset_token: token,
                reset_token_expiry: { [Op.gt]: new Date() }
            }
        });

        if (!admin) {
            return res.status(400).json({ message: 'Invalid or Expired Token' });
        }

        const salt = await bcrypt.genSalt(10);
        admin.password_hash = await bcrypt.hash(newPassword, salt);

        admin.reset_token = null;
        admin.reset_token_expiry = null;
        await admin.save();

        res.json({ success: true, message: 'Password Reset Successful. You can login now.' });

    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { login, forgotPassword, resetPassword, refreshToken };