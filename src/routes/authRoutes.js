const express = require('express');
const router = express.Router();
const { login, forgotPassword, resetPassword, refreshToken } = require('../controllers/authController');

const { forgotPasswordLimiter, loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);

router.post('/reset-password', resetPassword);


module.exports = router;