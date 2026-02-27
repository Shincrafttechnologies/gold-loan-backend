const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/authRoutes');
const loanRoutes = require('./routes/newLoanRoutes');
const sanitizeData = require('./middleware/sanitize');
const customerRoutes = require('./routes/customerRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const rateRoutes = require('./routes/rateRoutes');
const logoRoutes = require('./routes/logoRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const publicRoutes = require('./routes/publicRoutes');
const materialRoutes = require('./routes/materialRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const app = express();

const corsOptions = {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
};

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(sanitizeData);

app.get('/api/uploads/:filename', (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.status(401).send("Access denied. No token provided.");
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        const filePath = path.join(__dirname, 'uploads', req.params.filename);


        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send("Image not found");
        }
    } catch (error) {
        console.error("JWT Upload Auth Error:", error.message);
        res.status(403).send("Invalid or expired token");
    }
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/loan', loanRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/rate', rateRoutes);
app.use('/api/logo', logoRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/dashboard', dashboardRoutes);

module.exports = app;