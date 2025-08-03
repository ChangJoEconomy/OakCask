const asyncHandler = require('express-async-handler');
const User = require("../models/userModel");
const bcrypt = require('bcrypt');

// @desc Register page
// @route GET /register
const getRegisterPage = asyncHandler(async (req, res) => {
    res.render('register', {
        title: '회원가입',
        currentUser: 'guest',
        currentPage: 'register'
    });
});

// @desc Register user
// @route POST /register
const registerUser = asyncHandler(async (req, res) => {

    const { user_id, nickname, password, password_confirm } = req.body;

    // 필수 필드 검증
    if(!user_id || !nickname || !password || !password_confirm) {
        return res.render('register', {
            title: '회원가입',
            currentUser: 'guest',
            currentPage: 'register',
            error: '모든 필드를 입력해주세요.',
            formData: { user_id, nickname } // 비밀번호는 다시 입력하도록
        });
    }

    // 비밀번호 확인 검증
    if(password !== password_confirm) {
        return res.render('register', {
            title: '회원가입',
            currentUser: 'guest',
            currentPage: 'register',
            error: '비밀번호가 일치하지 않습니다.',
            formData: { user_id, nickname }
        });
    }

    // 비밀번호 길이 검증
    if(password.length < 6) {
        return res.render('register', {
            title: '회원가입',
            currentUser: 'guest',
            currentPage: 'register',
            error: '비밀번호는 최소 6자 이상이어야 합니다.',
            formData: { user_id, nickname }
        });
    }

    // 중복 user_id 체크
    const existingUser = await User.findOne({ user_id });
    if (existingUser) {
        return res.render('register', {
            title: '회원가입',
            currentUser: 'guest',
            currentPage: 'register',
            error: '이미 사용 중인 아이디입니다.',
            formData: { user_id, nickname }
        });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    // 새로운 사용자 생성
    const user = await User.create({
        user_id,
        nickname,
        hashed_password: hashedPassword
    });

    console.log("새로운 사용자 생성:", user.user_id);

    res.redirect('/login'); // 회원가입 후 로그인 페이지로 리다이렉트
});

module.exports = {
    getRegisterPage,
    registerUser
};