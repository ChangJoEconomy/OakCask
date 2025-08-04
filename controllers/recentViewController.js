const asyncHandler = require('express-async-handler');
const RecentView = require('../models/RecentView.js');
const Whiskey = require('../models/whiskeyModel');

// @desc 최근 본 위스키 추가/업데이트
// @route POST /api/recent-view
const addRecentView = asyncHandler(async (req, res) => {
    const { whiskey_id } = req.body;
    
    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    
    const user_id = req.user.user_id;
    
    // 위스키 존재 확인
    const whiskey = await Whiskey.findOne({ whiskey_id });
    if (!whiskey) {
        return res.status(404).json({ error: '위스키를 찾을 수 없습니다.' });
    }
    
    try {
        // 기존 기록이 있으면 업데이트, 없으면 새로 생성
        await RecentView.findOneAndUpdate(
            { user_id, whiskey_id },
            { view_date: new Date() },
            { upsert: true, new: true }
        );
        
        res.json({ success: true, message: '최근 본 위스키에 추가되었습니다.' });
    } catch (error) {
        console.error('최근 본 위스키 추가 오류:', error);
        res.status(500).json({ error: '최근 본 위스키 추가 중 오류가 발생했습니다.' });
    }
});

// @desc 사용자의 최근 본 위스키 목록 조회
// @route GET /api/recent-view
const getRecentViews = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    
    const user_id = req.user.user_id;
    const limit = parseInt(req.query.limit) || 10; // 기본 10개
    
    try {
        const recentViews = await RecentView.aggregate([
            { $match: { user_id } },
            { $sort: { view_date: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'whiskeys',
                    localField: 'whiskey_id',
                    foreignField: 'whiskey_id',
                    as: 'whiskey'
                }
            },
            { $unwind: '$whiskey' }
        ]);
        
        res.json(recentViews);
    } catch (error) {
        console.error('최근 본 위스키 조회 오류:', error);
        res.status(500).json({ error: '최근 본 위스키 조회 중 오류가 발생했습니다.' });
    }
});

// @desc 특정 최근 본 위스키 삭제
// @route DELETE /api/recent-view/:whiskey_id
const removeRecentView = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    
    const { whiskey_id } = req.params;
    const user_id = req.user.user_id;
    
    try {
        const deletedView = await RecentView.findOneAndDelete({ user_id, whiskey_id });
        
        if (!deletedView) {
            return res.status(404).json({ error: '최근 본 기록을 찾을 수 없습니다.' });
        }
        
        res.json({ success: true, message: '최근 본 기록이 삭제되었습니다.' });
    } catch (error) {
        console.error('최근 본 위스키 삭제 오류:', error);
        res.status(500).json({ error: '최근 본 위스키 삭제 중 오류가 발생했습니다.' });
    }
});

// @desc 모든 최근 본 위스키 삭제
// @route DELETE /api/recent-view
const clearRecentViews = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    
    const user_id = req.user.user_id;
    
    try {
        await RecentView.deleteMany({ user_id });
        res.json({ success: true, message: '모든 최근 본 기록이 삭제되었습니다.' });
    } catch (error) {
        console.error('최근 본 위스키 전체 삭제 오류:', error);
        res.status(500).json({ error: '최근 본 위스키 삭제 중 오류가 발생했습니다.' });
    }
});

module.exports = {
    addRecentView,
    getRecentViews,
    removeRecentView,
    clearRecentViews
};
