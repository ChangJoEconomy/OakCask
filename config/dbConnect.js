const mongoose = require('mongoose');
require('dotenv').config();

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.DB_CONNECT, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 20000,
            maxPoolSize: 10,
            minPoolSize: 2,
            family: 4,
            autoIndex: true,
        });
        console.log("DB connected");
    }
    catch (error) {
        console.error(`DB connection error: ${error}`);
        process.exit(1); // Exit the process with failure
    }
}

module.exports = dbConnect;