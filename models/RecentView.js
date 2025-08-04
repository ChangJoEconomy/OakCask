const mongoose = require('mongoose');

const recentViewSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    whiskey_id: {
        type: String,
        required: true
    },
    view_date: {
        type: Date,
        default: Date.now
    }
});

// 복합 인덱스 생성 (사용자 + 위스키 조합은 고유해야 함)
recentViewSchema.index({ user_id: 1, whiskey_id: 1 }, { unique: true });

// 사용자별 최신 조회 순서를 위한 인덱스
recentViewSchema.index({ user_id: 1, view_date: -1 });

// 오래된 기록 자동 삭제를 위한 TTL 인덱스 (30일 후 자동 삭제)
recentViewSchema.index({ view_date: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('RecentView', recentViewSchema);
