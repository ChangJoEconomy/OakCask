const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');
require('dotenv').config();
const jwtSecret = process.env.JWT_SECRET;

const checkLogin = asyncHandler(async (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    const token = req.cookies?.token;
    if (!token) {
        req.user = null; // 비로그인 상태로 설정
        return next(); // 로그인이 필요한 페이지에서는 별도 처리
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        
        // 토큰이 유효하면 사용자 정보를 req.user에 저장
        console.log("토큰 검증 성공:", decoded);
        
        // nickname 정보를 데이터베이스에서 가져오기
        const user = await User.findOne({ user_id: decoded.user_id }).select('nickname');
        if (user) {
            decoded.nickname = user.nickname;
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        req.user = null; // 토큰이 유효하지 않으면 비로그인 상태
        return next();
    }
});

// req.user에 사용자가 없으면 로그인으로 리다이렉트
const redirectIfNotLoggedIn = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    next();
};

module.exports = {
    checkLogin,
    redirectIfNotLoggedIn
};