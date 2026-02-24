const xss = require('xss');

const sanitizeData = (req, res, next) => {
    const clean = (data) => {
        if (typeof data === 'string') {
            return xss(data.trim());
        }
        if (typeof data === 'object' && data !== null) {
            for (let key in data) {
                data[key] = clean(data[key]);
            }
        }
        return data;
    };

    if (req.body) {
        req.body = clean(req.body);
    }
    if (req.query) {
        req.query = clean(req.query);
    }


    if (req.params) {
        req.params = clean(req.params);
    }

    next();
};

module.exports = sanitizeData;