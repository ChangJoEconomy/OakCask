const mongoose = require('mongoose');

const whiskeyReviewSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    whiskey_id: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    review_text: {
        type: String,
        default: null
    },
    write_date: {
        type: Date,
        default: Date.now
    },
    body: {
        type: Number,
        min: 1,
        max: 5
    },
    richness: {
        type: Number,
        min: 1,
        max: 5
    },
    smoke: {
        type: Number,
        min: 1,
        max: 5
    },
    sweetness: {
        type: Number,
        min: 1,
        max: 5
    }
});

// 복합 인덱스 생성 (사용자 + 위스키 조합은 고유해야 함)
whiskeyReviewSchema.index({ user_id: 1, whiskey_id: 1 }, { unique: true });

// 사용자별 최신 리뷰 조회를 위한 인덱스
whiskeyReviewSchema.index({ user_id: 1, write_date: -1 });

// 위스키별 리뷰 조회를 위한 인덱스
whiskeyReviewSchema.index({ whiskey_id: 1, write_date: -1 });

module.exports = mongoose.model('WhiskeyReview', whiskeyReviewSchema);
