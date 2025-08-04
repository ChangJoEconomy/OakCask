const asyncHandler = require('express-async-handler');
const RecentView = require('../models/RecentView.js');
const Whiskey = require('../models/whiskeyModel');

// @desc recent page
// @route GET /recent
const getRecentPage = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 12; // 한 페이지당 12개
    const skip = (page - 1) * limit;
    
    let recentWhiskeys = [];
    let pagination = null;
    
    if (req.user) {
        // 사용자의 최근 본 위스키 조회 (위스키 정보와 함께)
        const recentViews = await RecentView.aggregate([
            { $match: { user_id: req.user.user_id } },
            { $sort: { view_date: -1 } },
            { $skip: skip },
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
        
        recentWhiskeys = recentViews;
        
        // 전체 최근 본 위스키 개수
        const totalViews = await RecentView.countDocuments({ user_id: req.user.user_id });
        const totalPages = Math.ceil(totalViews / limit);
        
        pagination = {
            currentPage: page,
            totalPages: totalPages,
            totalViews: totalViews,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        };
    }
    
    res.render('recent', {
        title: '최근 본 위스키 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest',
        currentPage: 'recent',
        recentWhiskeys: recentWhiskeys,
        pagination: pagination
    });
});

module.exports = {
    getRecentPage
};