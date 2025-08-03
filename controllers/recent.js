const asyncHandler = require('express-async-handler');

// @desc recent page
// @route GET /recent
const getRecentPage = asyncHandler(async (req, res) => {
    res.render('recent', {
        title: '최근 본 위스키 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest', // 로그인된 사용자의 닉네임 또는 guest
        currentPage: 'recent'
    });
});

module.exports = {
    getRecentPage
};