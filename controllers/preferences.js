const asyncHandler = require('express-async-handler');
const Preference = require('../models/Preference');

// @desc    선호도 입력 페이지 렌더링
// @route   GET /preferences
// @access  Private
const getPreferencesPage = asyncHandler(async (req, res) => {
    res.render('preferences', {
        title: '위스키 취향 입력 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest',
        currentPage: 'preferences'
    });
});

// @desc    사용자 선호도 조회
// @route   GET /api/preferences
// @access  Private
const getPreference = asyncHandler(async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const preference = await Preference.findOne({ user_id });
        
        res.status(200).json({
            success: true,
            preference: preference
        });
    } catch (error) {
        console.error('선호도 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '선호도를 조회할 수 없습니다.'
        });
    }
});

// @desc    사용자 선호도 저장/업데이트
// @route   POST /api/preferences
// @access  Private
const savePreference = asyncHandler(async (req, res) => {
    try {
        const user_id = req.user.user_id;
        console.log('저장 요청 데이터:', req.body);
        console.log('사용자 ID:', user_id);

        const preferenceData = {
            user_id,
            body: req.body.body !== undefined ? Number(req.body.body) : null,
            richness: req.body.richness !== undefined ? Number(req.body.richness) : null,
            smoke: req.body.smoke !== undefined ? Number(req.body.smoke) : null,
            sweetness: req.body.sweetness !== undefined ? Number(req.body.sweetness) : null,
            min_price: req.body.min_price !== undefined ? Number(req.body.min_price) : null,
            max_price: req.body.max_price !== undefined ? Number(req.body.max_price) : null,
            min_alcohol: req.body.min_alcohol !== undefined ? Number(req.body.min_alcohol) : null,
            max_alcohol: req.body.max_alcohol !== undefined ? Number(req.body.max_alcohol) : null,
            keyword: req.body.keyword ? String(req.body.keyword).trim() : ''
        };

        console.log('저장할 데이터:', preferenceData);

        // upsert 방식으로 변경 (삭제 후 생성이 아닌)
        const savedPreference = await Preference.findOneAndUpdate(
            { user_id },
            preferenceData,
            { 
                upsert: true, 
                new: true, 
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        console.log('저장 완료:', savedPreference);

        res.status(200).json({
            success: true,
            message: '선호도가 저장되었습니다.',
            preference: savedPreference
        });
    } catch (error) {
        console.error('선호도 저장 실패:', error);
        res.status(500).json({
            success: false,
            message: '선호도를 저장할 수 없습니다.',
            error: error.message
        });
    }
});

module.exports = {
    getPreferencesPage,
    getPreference,
    savePreference
};