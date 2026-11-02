
const mongoose = require("mongoose");
const User = require("../models/User");

const requireAuth = async (req, res, next) => {
    try {
        const userId = req.session?.userId;

        if (!userId || !mongoose.isObjectIdOrHexString(userId)) {
            return res.status(401).json({
                message: "Authentication required. Please log in."
            });
        }

        const user = await User.findById(userId)
            .select("_id name email role");

        if (!user) {
            return res.status(401).json({
                message: "User account no longer exists"
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("Authentication error:", error);
        next(error);
    }
};

module.exports = requireAuth;
