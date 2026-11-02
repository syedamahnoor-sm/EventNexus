const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middleware/errorHandler");
const createSessionMiddleware = require("./config/session");
const { verifyCsrfToken } = require("./middleware/csrf");
const eventRoutes = require("./routes/eventRoutes");

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));
app.use(express.json({ limit: "10kb" }));
app.use(createSessionMiddleware());
app.use(verifyCsrfToken);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many requests. Please try again later."
    }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/events", eventRoutes);

app.use(errorHandler);

module.exports = app;
