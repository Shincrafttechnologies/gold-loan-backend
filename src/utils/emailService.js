const emailjs = require('@emailjs/nodejs');
require('dotenv').config();

const sendResetEmail = async (userEmail, resetLink) => {

    const templateParams = {
        to_email: userEmail,
        link: resetLink,
    };

    try {
        await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_TEMPLATE_ID,
            templateParams,
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY,
                privateKey: process.env.EMAILJS_PRIVATE_KEY,
            }
        );
        console.log(`Password Reset Email Sent to: ${userEmail}`);
        return true;
    } catch (error) {
        console.error("EmailJS Error:", error);
        return false;
    }
};

module.exports = { sendResetEmail };