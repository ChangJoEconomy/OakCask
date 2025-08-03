const mongoose = require('mongoose');
require('dotenv').config();

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.DB_CONNECT);
        console.log("DB connected");
    }
    catch (error) {
        console.error(`DB connection error: ${error}`);
        process.exit(1); // Exit the process with failure
    }
}

module.exports = dbConnect;