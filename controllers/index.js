const asyncHandler = require('express-async-handler');
const Whiskey = require('../models/whiskeyModel');

// @desc home page (전체 위스키 목록)
// #route GET /
const getHomePage = asyncHandler(async (req, res) => {
    // db에서 전체 위스키 가져오기
    const whiskeys = await Whiskey.find({})
        .select('whiskey_id name origin type price alcohol age_years image_path')
        .sort({ name: 1 }); // 이름순 정렬

    res.render('index', {
        title: '전체 위스키 목록 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest', // 로그인된 사용자의 닉네임 또는 guest
        currentPage: 'index',
        whiskeys: whiskeys
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