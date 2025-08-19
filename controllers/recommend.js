const asyncHandler = require('express-async-handler');
const WhiskeyAgent = require('../services/WhiskeyAgent'); // import 유지
// 싱글톤 에이전트: 프로세스 생명주기 동안 재사용
const whiskeyAgent = new WhiskeyAgent();

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
        const { query, usePreferences, preferences, limit } = req.body;
        const limitNum = Math.min(20, Math.max(1, parseInt(limit, 10) || 10));
        
        if (!query || query.trim() === '') {
            return res.status(400).json({
                success: false,
                message: '질문을 입력해주세요.'
            });
        }

        let enhancedQuery = query;
        
        // 취향정보가 있는 경우 프롬프트에 추가
        if (usePreferences && preferences) {
            const preferenceContext = generatePreferenceContext(preferences);
            enhancedQuery = `${query}

[사용자 취향 정보]
${preferenceContext}

위 취향 정보를 참고하여 사용자에게 맞는 위스키를 추천해주세요.`;
        }

        const result = await whiskeyAgent.getRecommendation(enhancedQuery, limitNum);
        
        res.json({
            success: result.success,
            analysis: result.analysis,
            recommendations: result.recommendations,
            summary: result.summary,
            message: result.message,
            usedPreferences: usePreferences && preferences ? true : false
        });
        
    } catch (error) {
        console.error('AI 추천 오류:', error);
        res.status(500).json({
            success: false,
            message: error.message || '추천 시스템에 일시적인 문제가 발생했습니다.'
        });
    }
});

// 취향정보를 프롬프트 컨텍스트로 변환하는 함수
function generatePreferenceContext(preferences) {
    const contexts = [];
    
    // 맛 선호도
    const tasteLabels = {
        body: ['매우 가벼움', '가벼움', '보통', '진함', '매우 진함'],
        richness: ['매우 단순', '단순', '보통', '복잡', '매우 복잡'],
        smoke: ['없음', '약함', '보통', '강함', '매우 강함'],
        sweetness: ['매우 드라이', '드라이', '보통', '달콤', '매우 달콤']
    };
    
    if (preferences.body !== null) {
        contexts.push(`바디감: ${tasteLabels.body[preferences.body - 1] || '보통'}`);
    }
    if (preferences.richness !== null) {
        contexts.push(`풍미 복잡도: ${tasteLabels.richness[preferences.richness - 1] || '보통'}`);
    }
    if (preferences.smoke !== null) {
        contexts.push(`스모키함: ${tasteLabels.smoke[preferences.smoke - 1] || '보통'}`);
    }
    if (preferences.sweetness !== null) {
        contexts.push(`단맛: ${tasteLabels.sweetness[preferences.sweetness - 1] || '보통'}`);
    }
    
    // 가격 범위
    if (preferences.min_price !== null && preferences.max_price !== null) {
        contexts.push(`선호 가격대: ${preferences.min_price.toLocaleString()}원 ~ ${preferences.max_price.toLocaleString()}원`);
    } else if (preferences.min_price !== null) {
        contexts.push(`최소 가격: ${preferences.min_price.toLocaleString()}원 이상`);
    } else if (preferences.max_price !== null) {
        contexts.push(`최대 가격: ${preferences.max_price.toLocaleString()}원 이하`);
    }
    
    // 도수 범위
    if (preferences.min_alcohol !== null && preferences.max_alcohol !== null) {
        contexts.push(`선호 도수: ${preferences.min_alcohol}% ~ ${preferences.max_alcohol}%`);
    } else if (preferences.min_alcohol !== null) {
        contexts.push(`최소 도수: ${preferences.min_alcohol}% 이상`);
    } else if (preferences.max_alcohol !== null) {
        contexts.push(`최대 도수: ${preferences.max_alcohol}% 이하`);
    }
    
    // 키워드
    if (preferences.keyword && preferences.keyword.trim()) {
        contexts.push(`선호 키워드: ${preferences.keyword}`);
    }
    
    return contexts.join('\n');
}

module.exports = {
    getRecommendPage,
    getAIRecommendation
};