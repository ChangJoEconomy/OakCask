const Whiskey = require('../models/whiskeyModel');
const mongoose = require('mongoose');

class WhiskeyRecommendationService {
    async ensureConnection() {
        if (mongoose.connection.readyState !== 1) {
            await new Promise((resolve, reject) => {
                if (mongoose.connection.readyState === 1) {
                    resolve();
                } else {
                    mongoose.connection.once('connected', resolve);
                    mongoose.connection.once('error', reject);
                    setTimeout(() => reject(new Error('DB connection timeout')), 15000);
                }
            });
        }
    }

    async getAllWhiskeys() {
        try {
            await this.ensureConnection();
            const whiskeys = await Whiskey
                .find({}, 'whiskey_id name price age_years origin type body richness smoke sweetness image_path')
                .lean();
            return whiskeys.map(w => ({
                id: w.whiskey_id,
                name: w.name,
                price: w.price,
                age: w.age_years || null,
                origin: w.origin || '미상',
                type: w.type || '미상',
                body: w.body || 0,
                richness: w.richness || 0,
                smoke: w.smoke || 0,
                sweetness: w.sweetness || 0,
                image_path: w.image_path || null
            }));
        } catch (error) {
            console.error('위스키 목록 조회 실패:', error);
            return [];
        }
    }

    async getAllWhiskeysLimited(limit = 20) {
        try {
            await this.ensureConnection();
            const whiskeys = await Whiskey
                .find({}, 'whiskey_id name price age_years origin type body richness smoke sweetness image_path')
                .limit(limit)
                .lean();
            return whiskeys.map(w => ({
                id: w.whiskey_id,
                name: w.name,
                price: w.price,
                age: w.age_years || null,
                origin: w.origin || '미상',
                type: w.type || '미상',
                body: w.body || 0,
                richness: w.richness || 0,
                smoke: w.smoke || 0,
                sweetness: w.sweetness || 0,
                image_path: w.image_path || null
            }));
        } catch (error) {
            console.error('위스키 제한 목록 조회 실패:', error);
            return [];
        }
    }

    async getSampleWhiskeys(sampleSize = 200) {
        try {
            await this.ensureConnection();
            const docs = await Whiskey.aggregate([
                { $sample: { size: sampleSize } },
                { $project: { whiskey_id: 1, name: 1, price: 1, age_years: 1, origin: 1, type: 1, body: 1, richness: 1, smoke: 1, sweetness: 1, image_path: 1 } }
            ]);
            return docs.map(w => ({
                id: w.whiskey_id,
                name: w.name,
                price: w.price,
                age: w.age_years || null,
                origin: w.origin || '미상',
                type: w.type || '미상',
                body: w.body || 0,
                richness: w.richness || 0,
                smoke: w.smoke || 0,
                sweetness: w.sweetness || 0,
                image_path: w.image_path || null
            }));
        } catch (error) {
            console.error('위스키 샘플 조회 실패:', error);
            return [];
        }
    }

    async getWhiskeysByPriceRange(minPrice, maxPrice) {
        try {
            await this.ensureConnection();
            const whiskeys = await Whiskey
                .find({ price: { $gte: minPrice, $lte: maxPrice } }, 'whiskey_id name price age_years origin type body richness smoke sweetness image_path')
                .limit(200)
                .lean();
            
            return whiskeys.map(w => ({
                id: w.whiskey_id,
                name: w.name,
                price: w.price,
                age: w.age_years || null,
                origin: w.origin || '미상',
                type: w.type || '미상',
                body: w.body || 0,
                richness: w.richness || 0,
                smoke: w.smoke || 0,
                sweetness: w.sweetness || 0,
                image_path: w.image_path || null
            }));
        } catch (error) {
            console.error('가격별 위스키 조회 실패:', error);
            return [];
        }
    }

    async getWhiskeysByFlavorProfile(targetBody, targetRichness, targetSmoke, targetSweetness, tolerance = 1) {
        try {
            await this.ensureConnection();
            const query = {};
            
            if (targetBody !== undefined) {
                query.body = { $gte: Math.max(0, targetBody - tolerance), $lte: Math.min(5, targetBody + tolerance) };
            }
            if (targetRichness !== undefined) {
                query.richness = { $gte: Math.max(0, targetRichness - tolerance), $lte: Math.min(5, targetRichness + tolerance) };
            }
            if (targetSmoke !== undefined) {
                query.smoke = { $gte: Math.max(0, targetSmoke - tolerance), $lte: Math.min(5, targetSmoke + tolerance) };
            }
            if (targetSweetness !== undefined) {
                query.sweetness = { $gte: Math.max(0, targetSweetness - tolerance), $lte: Math.min(5, targetSweetness + tolerance) };
            }

            const whiskeys = await Whiskey
                .find(query, 'whiskey_id name price age_years origin type body richness smoke sweetness image_path')
                .limit(200)
                .lean();
            
            return whiskeys.map(w => ({
                id: w.whiskey_id,
                name: w.name,
                price: w.price,
                age: w.age_years || null,
                origin: w.origin || '미상',
                type: w.type || '미상',
                body: w.body || 0,
                richness: w.richness || 0,
                smoke: w.smoke || 0,
                sweetness: w.sweetness || 0,
                image_path: w.image_path || null
            }));
        } catch (error) {
            console.error('맛 프로필별 위스키 조회 실패:', error);
            return [];
        }
    }

    async getWhiskeysByOrigin(origin) {
        try {
            await this.ensureConnection();
            const whiskeys = await Whiskey
                .find({ origin: new RegExp(origin, 'i') }, 'whiskey_id name price age_years origin type body richness smoke sweetness image_path')
                .limit(200)
                .lean();
            
            return whiskeys.map(w => ({
                id: w.whiskey_id,
                name: w.name,
                price: w.price,
                age: w.age_years || null,
                origin: w.origin || '미상',
                type: w.type || '미상',
                body: w.body || 0,
                richness: w.richness || 0,
                smoke: w.smoke || 0,
                sweetness: w.sweetness || 0,
                image_path: w.image_path || null
            }));
        } catch (error) {
            console.error('원산지별 위스키 조회 실패:', error);
            return [];
        }
    }

    async getWhiskeysByType(type) {
        try {
            await this.ensureConnection();
            const whiskeys = await Whiskey
                .find({ type: new RegExp(type, 'i') }, 'whiskey_id name price age_years origin type body richness smoke sweetness image_path')
                .limit(200)
                .lean();
            
            return whiskeys.map(w => ({
                id: w.whiskey_id,
                name: w.name,
                price: w.price,
                age: w.age_years || null,
                origin: w.origin || '미상',
                type: w.type || '미상',
                body: w.body || 0,
                richness: w.richness || 0,
                smoke: w.smoke || 0,
                sweetness: w.sweetness || 0,
                image_path: w.image_path || null
            }));
        } catch (error) {
            console.error('타입별 위스키 조회 실패:', error);
            return [];
        }
    }
}

module.exports = WhiskeyRecommendationService;
