const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middleware/errorHandler");
const createSessionMiddleware = require("./config/session");
const { verifyCsrfToken } = require("./middleware/csrf");
const eventRoutes = require("./routes/eventRoutes");
const {
    registrationRoutes,
    myRegistrationsRouter
} = require("./routes/registrationRoutes");

const app = express();

app.disable("x-powered-by");
// Session-dependent responses must never be reused after logout or account changes.
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));
const standardJson = express.json({ limit: '10kb' });
const eventJson = express.json({ limit: '64kb' });
const recapJson = express.json({ limit: '128kb' });
app.use((req, res, next) => {
    if (req.method === 'PATCH' && /^\/api\/events\/[^/]+\/recap\/?$/.test(req.path)) return recapJson(req, res, next);
    const eventWrite = (req.method === 'POST' && /^\/api\/events\/?$/.test(req.path)) || (req.method === 'PATCH' && /^\/api\/events\/[^/]+\/?$/.test(req.path)) || (req.method === 'POST' && /^\/api\/events\/[^/]+\/register\/?$/.test(req.path));
    return (eventWrite ? eventJson : standardJson)(req, res, next);
});
app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'This request exceeds the allowed size.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Send valid JSON.' });
    next(error);
});
app.use(createSessionMiddleware());
app.use(verifyCsrfToken);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: req => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
    message: {
        message: "Too many requests. Please try again later."
    }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/events", registrationRoutes);
app.use("/api/registrations", myRegistrationsRouter);
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/organizer', require('./routes/organizerRoutes'));

app.use(errorHandler);

module.exports = app;
