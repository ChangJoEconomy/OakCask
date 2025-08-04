const asyncHandler = require('express-async-handler');
const Whiskey = require('../models/whiskeyModel');

// @desc home page (전체 위스키 목록)
// @route GET /
const getHomePage = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // 현재 페이지 (기본값: 1)
    const limit = 24; // 한 페이지당 위스키 개수
    const skip = (page - 1) * limit;

    // db에서 페이지네이션된 위스키 가져오기 (limit개수만큼만 가져오기)
    const whiskeys = await Whiskey.find({})
        .select('whiskey_id name origin type price alcohol age_years image_path')
        .sort({ name: 1 }) // 이름순 정렬
        .skip(skip)
        .limit(limit);

    // 전체 위스키 개수 구하기 (페이지네이션 계산용)
    const totalWhiskeys = await Whiskey.countDocuments();
    const totalPages = Math.ceil(totalWhiskeys / limit);

    res.render('index', {
        title: '전체 위스키 목록 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest', // 로그인된 사용자의 닉네임 또는 guest
        currentPage: 'index',
        whiskeys: whiskeys,
        pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalWhiskeys: totalWhiskeys,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        }
    });
});

// @desc get whiskey detail
// @route GET /api/whiskey/:id
const getWhiskeyDetail = asyncHandler(async (req, res) => {
    const whiskey = await Whiskey.findOne({ whiskey_id: req.params.id });
    
    if (!whiskey) {
        return res.status(404).json({ error: '위스키를 찾을 수 없습니다.' });
    }
    
    res.json(whiskey);
});

module.exports = {
    getHomePage,
    getWhiskeyDetail
};