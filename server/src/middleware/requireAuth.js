
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            message: "Authentication required. Please log in."
        });
    }

    next();
};

module.exports = requireAuth;
