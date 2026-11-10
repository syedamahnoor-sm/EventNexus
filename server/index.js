require('dotenv').config()
const app = require('./src/app')
const connectDB = require("./src/config/db");

const PORT = Number(process.env.PORT || 5000)
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
}

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`EventNexus server running on port ${PORT}`);
    });
};

startServer();
