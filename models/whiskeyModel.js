const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const whiskeySchema = new Schema({
    whiskey_id: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    age_years: {
        type: Number,
        required: false,
        min: 0,
        default: null
    },
    alcohol: {
        type: Number,
        required: false,
        min: 0,
        max: 100,
        default: null
    },
    image_path: {
        type: String,
        required: false,
        default: null
    },
    origin: {
        type: String,
        required: false,
        trim: true,
        default: null
    },
    type: {
        type: String,
        required: false,
        trim: true,
        default: null
    },
    body: {
        type: Number,
        required: false,
        min: 0,
        max: 5,
        default: null
    },
    richness: {
        type: Number,
        required: false,
        min: 0,
        max: 5,
        default: null
    },
    smoke: {
        type: Number,
        required: false,
        min: 0,
        max: 5,
        default: null
    },
    sweetness: {
        type: Number,
        required: false,
        min: 0,
        max: 5,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Whiskeys', whiskeySchema);