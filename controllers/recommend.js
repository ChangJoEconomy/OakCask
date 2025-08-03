const asyncHandler = require('express-async-handler');

// @desc recommend page (AI 위스키 추천)
// @route GET /recommend
const getRecommendPage = asyncHandler(async (req, res) => {
    res.render('recommend', {
        title: '🥃 AI 위스키 추천 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest', // 로그인된 사용자의 닉네임 또는 guest
        currentPage: 'recommend'
    });
});

module.exports = {
    getRecommendPage
};