const express = require('express');
const router = express.Router();
const {
    getHomePage,
    getWhiskeyDetail,
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

// API 라우트
router.route('/api/whiskey/:id')
    .get(getWhiskeyDetail);

module.exports = router;