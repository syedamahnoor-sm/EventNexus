
const crypto = require("node:crypto");

const generateCsrfToken = (req, res, next) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto
            .randomBytes(32)
            .toString("hex");
    }

    next();
};

const verifyCsrfToken = (req, res, next) => {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];

    if (safeMethods.includes(req.method)) {
        return next();
    }

    const expectedToken = req.session?.csrfToken;
    const providedToken = req.get("X-CSRF-Token");

    if (
        typeof expectedToken !== "string" ||
        typeof providedToken !== "string" ||
        !/^[a-f0-9]{64}$/.test(expectedToken) ||
        !/^[a-f0-9]{64}$/.test(providedToken)
    ) {
        return res.status(403).json({
            message: "Invalid or missing CSRF token"
        });
    }

    const expected = Buffer.from(expectedToken, "hex");
    const provided = Buffer.from(providedToken, "hex");

    if (!crypto.timingSafeEqual(expected, provided)) {
        return res.status(403).json({
            message: "Invalid or missing CSRF token"
        });
    }

    next();
};

module.exports = {
    generateCsrfToken,
    verifyCsrfToken
};
