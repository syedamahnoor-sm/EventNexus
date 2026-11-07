const mongoose = require("mongoose");

const connectDB = async ({ throwOnError = false } = {}) => {
    try {
        await mongoose.connect(process.env.MONGO_URI, throwOnError ? { serverSelectionTimeoutMS: 10000 } : {});
        console.log("MongoDB connected successfully");
    } catch (error) {
        // CLI callers can close resources and report a sanitized failure without leaking URI details.
        if (throwOnError) throw new Error('MongoDB connection failed; connection details suppressed.');
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
