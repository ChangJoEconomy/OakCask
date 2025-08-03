const asyncHandler = require('express-async-handler');

// @desc preferences page
// @route GET /preferences
const getPreferencesPage = asyncHandler(async (req, res) => {
    res.render('preferences', {
        title: '위스키 취향 입력 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest', // 로그인된 사용자의 닉네임 또는 guest
        currentPage: 'preferences'
    });
});

module.exports = {
    getPreferencesPage
};