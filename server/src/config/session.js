const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const createSessionMiddleware = () => {
    if (!process.env.SESSION_SECRET) {
        throw new Error("SESSION_SECRET is required");
    }

    return session({
        name: "eventnexus.sid",

        secret: process.env.SESSION_SECRET,

        resave: false,
        saveUninitialized: false,

        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: "sessions",
            ttl: 24 * 60 * 60
        }),

        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        }
    });
};

module.exports = createSessionMiddleware;
