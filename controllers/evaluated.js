const asyncHandler = require('express-async-handler');
const WhiskeyReview = require('../models/WhiskeyReview');
const Whiskey = require('../models/whiskeyModel');

// @desc evaluated page
// @route GET /evaluated
const getEvaluatedPage = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 12; // 한 페이지당 12개
    const skip = (page - 1) * limit;
    
    let evaluatedWhiskeys = [];
    let pagination = null;
    
    if (req.user) {
        // 사용자의 리뷰 조회 (위스키 정보와 함께)
        const reviews = await WhiskeyReview.aggregate([
            { $match: { user_id: req.user.user_id } },
            { $sort: { write_date: -1 } },
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
        
        evaluatedWhiskeys = reviews;
        
        // 전체 리뷰 개수
        const totalReviews = await WhiskeyReview.countDocuments({ user_id: req.user.user_id });
        const totalPages = Math.ceil(totalReviews / limit);
        
        pagination = {
            currentPage: page,
            totalPages: totalPages,
            totalReviews: totalReviews,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        };
    }
    
    res.render('evaluated', {
        title: '내가 평가한 위스키 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest',
        currentPage: 'evaluated',
        evaluatedWhiskeys: evaluatedWhiskeys,
        pagination: pagination
    });
});

module.exports = {
    getEvaluatedPage
};