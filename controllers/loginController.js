const asyncHandler = require('express-async-handler');
const User = require("../models/userModel");
const bcrypt = require('bcrypt');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;


// @desc Login page
// @route GET /login
const getLoginPage = asyncHandler(async (req, res) => {
    res.render('login', {
        title: '로그인 - Oktong',
        currentUser: 'guest',
        currentPage: 'login'
    });
});

// @desc Login user
// @route POST /login
const loginUser = asyncHandler(async (req, res) => {
    const { user_id, password } = req.body;

    if (!user_id || !password) {
        return res.render('login', {
            title: '로그인 - Oktong',
            currentUser: 'guest',
            currentPage: 'login',
            error: '모든 필드를 입력해주세요.',
            formData: { user_id }
        });
    }

    // 사용자 여부 확인
    const user = await User.findOne({ user_id });
    if (!user) {
        return res.render('login', {
            title: '로그인 - Oktong',
            currentUser: 'guest',
            currentPage: 'login',
            error: '존재하지 않는 사용자입니다.',
            formData: { user_id }
        });
    }

    // 비밀번호 검증
    const isMatch = await bcrypt.compare(password, user.hashed_password);
    if (!isMatch) {
        return res.render('login', {
            title: '로그인 - Oktong',
            currentUser: 'guest',
            currentPage: 'login',
            error: '비밀번호가 일치하지 않습니다.',
            formData: { user_id }
        });
    }

    // 로그인 성공 => JWT 토큰 생성
    const token = jwt.sign({ user_id: user.user_id }, jwtSecret, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true });
    // 로그인 후 홈으로 리다이렉트
    res.redirect('/');
});

// @desc Logout user
// @route GET /logout
const logoutUser = asyncHandler(async (req, res) => {
    // 쿠키에서 토큰 제거
    res.clearCookie('token');
    // 로그아웃 후 홈으로 리다이렉트
    res.redirect('/');
});


module.exports = {
    getLoginPage,
    loginUser,
    logoutUser
};
