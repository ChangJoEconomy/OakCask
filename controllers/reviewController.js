const asyncHandler = require('express-async-handler');
const WhiskeyReview = require('../models/WhiskeyReview');
const Whiskey = require('../models/whiskeyModel');

// @desc 리뷰 작성/수정
// @route POST /api/review
const createOrUpdateReview = asyncHandler(async (req, res) => {
    const { whiskey_id, rating, review_text, body, richness, smoke, sweetness } = req.body;
    
    // 로그인 확인
    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    
    const user_id = req.user.user_id;
    
    // 위스키 존재 확인
    const whiskey = await Whiskey.findOne({ whiskey_id });
    if (!whiskey) {
        return res.status(404).json({ error: '위스키를 찾을 수 없습니다.' });
    }
    
    try {
        // 기존 리뷰가 있는지 확인
        const existingReview = await WhiskeyReview.findOne({ user_id, whiskey_id });
        
        if (existingReview) {
            // 기존 리뷰 업데이트
            const updatedReview = await WhiskeyReview.findOneAndUpdate(
                { user_id, whiskey_id },
                {
                    rating,
                    review_text,
                    body,
                    richness,
                    smoke,
                    sweetness,
                    write_date: new Date()
                },
                { new: true }
            );
            
            res.json({
                success: true,
                message: '리뷰가 수정되었습니다.',
                review: updatedReview
            });
        } else {
            // 새 리뷰 생성
            const newReview = new WhiskeyReview({
                user_id,
                whiskey_id,
                rating,
                review_text,
                body,
                richness,
                smoke,
                sweetness
            });
            
            const savedReview = await newReview.save();
            
            res.status(201).json({
                success: true,
                message: '리뷰가 작성되었습니다.',
                review: savedReview
            });
        }
    } catch (error) {
        console.error('리뷰 저장 오류:', error);
        res.status(500).json({ error: '리뷰 저장 중 오류가 발생했습니다.' });
    }
});

// @desc 사용자의 특정 위스키 리뷰 조회
// @route GET /api/review/:whiskey_id
const getUserReview = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    
    const { whiskey_id } = req.params;
    const user_id = req.user.user_id;
    
    const review = await WhiskeyReview.findOne({ user_id, whiskey_id });
    
    if (!review) {
        return res.status(404).json({ error: '리뷰를 찾을 수 없습니다.' });
    }
    
    res.json(review);
});

// @desc 리뷰 삭제
// @route DELETE /api/review/:whiskey_id
const deleteReview = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.user_id) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    
    const { whiskey_id } = req.params;
    const user_id = req.user.user_id;
    
    const deletedReview = await WhiskeyReview.findOneAndDelete({ user_id, whiskey_id });
    
    if (!deletedReview) {
        return res.status(404).json({ error: '리뷰를 찾을 수 없습니다.' });
    }
    
    res.json({
        success: true,
        message: '리뷰가 삭제되었습니다.'
    });
});

module.exports = {
    createOrUpdateReview,
    getUserReview,
    deleteReview
};
