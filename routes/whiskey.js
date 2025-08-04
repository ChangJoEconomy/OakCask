const express = require('express');
const router = express.Router();
const WhiskeyRecommendationService = require('../services/WhiskeyRecommendationService');

console.log('위스키 라우터 로드됨');

const whiskeyService = new WhiskeyRecommendationService();

// 테스트 라우트
router.get('/test', (req, res) => {
    console.log('테스트 라우트 호출됨');
    res.json({ message: '위스키 라우터 작동 중' });
});

// 모든 위스키 조회 (토큰 절약을 위해 제한)
router.get('/all', async (req, res) => {
    console.log('위스키 전체 조회 API 호출됨');
    try {
        const whiskeys = await whiskeyService.getAllWhiskeys();
        console.log(`위스키 조회 결과: ${whiskeys.length}개`);
        
        // 토큰 절약을 위해 최대 20개로 제한하고 필수 정보만 반환
        const limitedWhiskeys = whiskeys.slice(0, 20).map(w => ({
            id: w.id,
            name: w.name,
            price: w.price,
            age: w.age,
            origin: w.origin,
            type: w.type,
            body: w.body,
            richness: w.richness,
            smoke: w.smoke,
            sweetness: w.sweetness
        }));
        
        res.json(limitedWhiskeys);
    } catch (error) {
        console.error('위스키 조회 오류:', error);
        res.status(500).json({ error: '위스키 조회 실패' });
    }
});

// 가격대별 위스키 검색 (토큰 절약 최적화)
router.get('/price', async (req, res) => {
    try {
        const { minPrice, maxPrice } = req.query;
        console.log(`가격대별 검색: ${minPrice} - ${maxPrice}`);
        
        const whiskeys = await whiskeyService.getWhiskeysByPriceRange(
            parseFloat(minPrice), 
            parseFloat(maxPrice)
        );
        
        // 토큰 절약: 최대 30개로 제한하고 간소화된 정보만 반환
        const optimizedWhiskeys = whiskeys.slice(0, 30).map(w => ({
            id: w.id,
            name: w.name,
            price: w.price,
            age: w.age,
            origin: w.origin,
            type: w.type,
            body: w.body,
            richness: w.richness,
            smoke: w.smoke,
            sweetness: w.sweetness
        }));
        
        console.log(`가격대별 검색 결과: ${optimizedWhiskeys.length}개 반환`);
        res.json(optimizedWhiskeys);
    } catch (error) {
        console.error('가격별 위스키 조회 오류:', error);
        res.status(500).json({ error: '가격별 위스키 조회 실패' });
    }
});

// 맛 프로필별 위스키 검색
router.get('/flavor', async (req, res) => {
    try {
        const { body, richness, smoke, sweetness, tolerance = 1 } = req.query;
        const whiskeys = await whiskeyService.getWhiskeysByFlavorProfile(
            parseFloat(body),
            parseFloat(richness), 
            parseFloat(smoke),
            parseFloat(sweetness),
            parseFloat(tolerance)
        );
        res.json(whiskeys);
    } catch (error) {
        console.error('맛별 위스키 조회 오류:', error);
        res.status(500).json({ error: '맛별 위스키 조회 실패' });
    }
});

// 원산지별 위스키 검색 (크기 제한 적용)
router.get('/origin', async (req, res) => {
    try {
        const { origin } = req.query;
        const allWhiskeys = await whiskeyService.getWhiskeysByOrigin(origin);
        
        // 응답 크기 제한: 최대 50개로 제한
        const whiskeys = allWhiskeys.slice(0, 50).map(w => ({
            id: w.id,
            name: w.name,
            price: w.price,
            age: w.age,
            origin: w.origin,
            type: w.type,
            body: w.body,
            richness: w.richness,
            smoke: w.smoke,
            sweetness: w.sweetness
        }));
        
        console.log(`원산지별 검색 결과: ${whiskeys.length}개 반환`);
        res.json(whiskeys);
    } catch (error) {
        console.error('원산지별 위스키 조회 오류:', error);
        res.status(500).json({ error: '원산지별 위스키 조회 실패' });
    }
});

// 타입별 위스키 검색
router.get('/type', async (req, res) => {
    try {
        const { type } = req.query;
        const whiskeys = await whiskeyService.getWhiskeysByType(type);
        res.json(whiskeys);
    } catch (error) {
        console.error('타입별 위스키 조회 오류:', error);
        res.status(500).json({ error: '타입별 위스키 조회 실패' });
    }
});

module.exports = router;
