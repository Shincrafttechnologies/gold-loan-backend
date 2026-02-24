const { verifyAccessToken } = require('../utils/jwt');

const authenticateAdmin = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) return res.status(401).json({ message: "Access Denied" });

    const decoded = verifyAccessToken(token);

    if (!decoded) {
        return res.status(401).json({ message: "Invalid or Expired Token" });
    }

    req.user = decoded;
    next();
};

module.exports = authenticateAdmin;