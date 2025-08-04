const express = require('express');
const router = express.Router();
const {
    getHomePage,
    getWhiskeyDetail,
    getWhiskeyDetailPage,
} = require('../controllers/index');
const {
    getPreferencesPage,
} = require("../controllers/preferences");
const {
    getEvaluatedPage,
} = require("../controllers/evaluated");
const {
    getRecentPage,
} = require("../controllers/recent");
const {
    getRecommendPage,
} = require("../controllers/recommend");
const {
    getLoginPage,
    loginUser,
    logoutUser
} = require("../controllers/loginController");
const {
    getRegisterPage,
    registerUser
} = require("../controllers/register");
const {
    createOrUpdateReview,
    getUserReview,
    deleteReview
} = require("../controllers/reviewController");
const {
    checkLogin,
    redirectIfNotLoggedIn
} = require('../middlewares/checkLogin');

router.route('/')
    .get(checkLogin, getHomePage);

router.route('/preferences')
    .get(checkLogin, redirectIfNotLoggedIn, getPreferencesPage);

router.route('/evaluated')
    .get(checkLogin, redirectIfNotLoggedIn, getEvaluatedPage);

router.route('/recent')
    .get(checkLogin, redirectIfNotLoggedIn, getRecentPage);

router.route('/recommend')
    .get(checkLogin, redirectIfNotLoggedIn, getRecommendPage);

router.route('/login')
    .get(getLoginPage)
    .post(loginUser);

router.route('/register')
    .get(getRegisterPage)
    .post(registerUser);

router.route('/logout')
    .get(logoutUser);

// 위스키 상세 페이지
router.route('/whiskey/:id')
    .get(checkLogin, getWhiskeyDetailPage);

// API 라우트
router.route('/api/whiskey/:id')
    .get(getWhiskeyDetail);

// 리뷰 API 라우트
router.route('/api/review')
    .post(checkLogin, createOrUpdateReview);

router.route('/api/review/:whiskey_id')
    .get(checkLogin, getUserReview)
    .delete(checkLogin, deleteReview);

module.exports = router;