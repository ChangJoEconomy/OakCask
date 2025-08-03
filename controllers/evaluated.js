const asyncHandler = require('express-async-handler');

// @desc evaluated page
// @route GET /evaluated
const getEvaluatedPage = asyncHandler(async (req, res) => {
    res.render('evaluated', {
        title: '내가 평가한 위스키 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest', // 로그인된 사용자의 닉네임 또는 guest
        currentPage: 'evaluated'
    });
});

module.exports = {
    getEvaluatedPage
};