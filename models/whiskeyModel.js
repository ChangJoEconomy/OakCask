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

// 자주 조회/필터링되는 필드에 인덱스 추가로 쿼리 성능 향상
whiskeySchema.index({ price: 1 });
whiskeySchema.index({ origin: 1 });
whiskeySchema.index({ type: 1 });
whiskeySchema.index({ name: 1 });
whiskeySchema.index({ age_years: 1 });
// 맛 프로필 범위 조회 최적화
whiskeySchema.index({ body: 1, richness: 1, smoke: 1, sweetness: 1 });

module.exports = mongoose.model('Whiskeys', whiskeySchema);