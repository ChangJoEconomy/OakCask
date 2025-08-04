const asyncHandler = require('express-async-handler');
const Whiskey = require('../models/whiskeyModel');

// @desc home page (전체 위스키 목록)
// @route GET /
const getHomePage = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // 현재 페이지 (기본값: 1)
    const limit = 24; // 한 페이지당 위스키 개수
    const skip = (page - 1) * limit;

    // 필터링 파라미터 받기
    const {
        type,
        minPrice,
        maxPrice,
        country,
        keywords,
        sortBy = 'name',
        sortOrder = 'asc'
    } = req.query;

    // MongoDB 쿼리 조건 객체 생성
    let filter = {};

    // 위스키 타입 필터
    if (type && type.trim() !== '') {
        filter.type = { $regex: type.trim(), $options: 'i' };
    }

    // 가격 범위 필터
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice && !isNaN(parseInt(minPrice))) {
            filter.price.$gte = parseInt(minPrice);
        }
        if (maxPrice && !isNaN(parseInt(maxPrice))) {
            filter.price.$lte = parseInt(maxPrice);
        }
    }

    // 국가/지역 필터
    if (country && country.trim() !== '') {
        filter.origin = { $regex: country.trim(), $options: 'i' };
    }

    // 위스키 이름 검색
    if (keywords && keywords.trim() !== '') {
        filter.name = { $regex: keywords.trim(), $options: 'i' };
    }

    // 정렬 옵션 설정
    let sortOptions = {};
    switch (sortBy) {
        case 'price':
            sortOptions.price = sortOrder === 'desc' ? -1 : 1;
            break;
        case 'age':
            sortOptions.age_years = sortOrder === 'desc' ? -1 : 1;
            break;
        case 'name':
        default:
            sortOptions.name = sortOrder === 'desc' ? -1 : 1;
            break;
    }

    // db에서 필터링된 위스키 가져오기
    const whiskeys = await Whiskey.find(filter)
        .select('whiskey_id name origin type price alcohol age_years image_path')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

    // 필터링된 위스키 총 개수 구하기
    const totalWhiskeys = await Whiskey.countDocuments(filter);
    const totalPages = Math.ceil(totalWhiskeys / limit);

    // 쿼리 파라미터를 페이지네이션 링크에 포함하기 위한 객체
    const queryParams = {
        ...(type && { type }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice }),
        ...(country && { country }),
        ...(keywords && { keywords }),
        ...(sortBy !== 'name' && { sortBy }),
        ...(sortOrder !== 'asc' && { sortOrder })
    };

    res.render('index', {
        title: '전체 위스키 목록 - Oktong',
        currentUser: req.user ? req.user.nickname : 'guest',
        currentPage: 'index',
        whiskeys: whiskeys,
        filters: {
            type: type || '',
            minPrice: minPrice || '',
            maxPrice: maxPrice || '',
            country: country || '',
            keywords: keywords || '',
            sortBy: sortBy || 'name',
            sortOrder: sortOrder || 'asc'
        },
        pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalWhiskeys: totalWhiskeys,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            queryParams: queryParams
        }
    });
});

// @desc get whiskey detail page
// @route GET /whiskey/:id
const getWhiskeyDetailPage = asyncHandler(async (req, res) => {
    const whiskey = await Whiskey.findOne({ whiskey_id: req.params.id });
    
    if (!whiskey) {
        return res.status(404).render('error', {
            title: '위스키를 찾을 수 없습니다 - Oktong',
            currentUser: req.user ? req.user.nickname : 'guest',
            currentPage: 'error',
            errorMessage: '요청하신 위스키를 찾을 수 없습니다.'
        });
    }
    
    res.render('whiskey-detail', {
        title: `${whiskey.name} - Oktong`,
        currentUser: req.user ? req.user.nickname : 'guest',
        currentPage: 'whiskey-detail',
        whiskey: whiskey,
        user: req.user // 사용자 정보 추가
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
    getWhiskeyDetail,
    getWhiskeyDetailPage
};