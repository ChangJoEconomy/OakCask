const asyncHandler = require('express-async-handler');
const WhiskeyAgent = require('../services/WhiskeyAgent'); // import 제거

// @desc recommend page (AI 위스키 추천)
// @route GET /recommend
const getRecommendPage = asyncHandler(async (req, res) => {
    res.render('recommend', {
        title: '🥃 AI 위스키 추천 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest',
        currentPage: 'recommend'
    });
});

// @desc AI 위스키 추천 API
// @route POST /api/recommend
const getAIRecommendation = asyncHandler(async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query || query.trim() === '') {
            return res.status(400).json({
                success: false,
                message: '질문을 입력해주세요.'
            });
        }

        const whiskeyAgent = new WhiskeyAgent();
        const result = await whiskeyAgent.getRecommendation(query);
        
        res.json({
            success: result.success,
            analysis: result.analysis,      // 추가
            recommendations: result.recommendations,
            summary: result.summary,        // 추가  
            message: result.message
        });
        
    } catch (error) {
        console.error('AI 추천 오류:', error);
        res.status(500).json({
            success: false,
            message: error.message || '추천 시스템에 일시적인 문제가 발생했습니다.'
        });
    }
});

module.exports = {
    getRecommendPage,
    getAIRecommendation
};