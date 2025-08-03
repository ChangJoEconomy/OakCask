const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    nickname: {
        type: String,
        required: true,
        trim: true
    },
    hashed_password: {
        type: String,
        required: true,
    },
});

module.exports = mongoose.model('User', userSchema);