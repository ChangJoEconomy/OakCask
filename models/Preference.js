const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    body: {
        type: Number,
        default: null
    },
    richness: {
        type: Number,
        default: null
    },
    smoke: {
        type: Number,
        default: null
    },
    sweetness: {
        type: Number,
        default: null
    },
    min_price: {
        type: Number,
        default: null
    },
    max_price: {
        type: Number,
        default: null
    },
    min_alcohol: {
        type: Number,
        default: null
    },
    max_alcohol: {
        type: Number,
        default: null
    },
    keyword: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('Preference', preferenceSchema);
