import Whiskey from '../models/whiskeyModel';

interface WhiskeyData {
    id: string;
    name: string;
    price: number;
    age: number | null;
    origin: string;
    type: string;
    body: number;
    richness: number;
    smoke: number;
    sweetness: number;
}

class WhiskeyRecommendationService {
    async getAllWhiskeys(): Promise<WhiskeyData[]> {
        try {
            const whiskeys = await Whiskey.find({}).lean();
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
                sweetness: w.sweetness || 0
            }));
        } catch (error) {
            console.error('위스키 목록 조회 실패:', error);
            return [];
        }
    }

    async getWhiskeysByPriceRange(minPrice: number, maxPrice: number): Promise<WhiskeyData[]> {
        try {
            const whiskeys = await Whiskey.find({
                price: { $gte: minPrice, $lte: maxPrice }
            }).lean();
            
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
                sweetness: w.sweetness || 0
            }));
        } catch (error) {
            console.error('가격별 위스키 조회 실패:', error);
            return [];
        }
    }

    async getWhiskeysByFlavorProfile(
        targetBody: number, 
        targetRichness: number, 
        targetSmoke: number, 
        targetSweetness: number, 
        tolerance: number = 1
    ): Promise<WhiskeyData[]> {
        try {
            const query: any = {};
            
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

            const whiskeys = await Whiskey.find(query).lean();
            
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
                sweetness: w.sweetness || 0
            }));
        } catch (error) {
            console.error('맛 프로필별 위스키 조회 실패:', error);
            return [];
        }
    }

    async getWhiskeysByOrigin(origin: string): Promise<WhiskeyData[]> {
        try {
            const whiskeys = await Whiskey.find({
                origin: new RegExp(origin, 'i')
            }).lean();
            
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
                sweetness: w.sweetness || 0
            }));
        } catch (error) {
            console.error('원산지별 위스키 조회 실패:', error);
            return [];
        }
    }

    async getWhiskeysByType(type: string): Promise<WhiskeyData[]> {
        try {
            const whiskeys = await Whiskey.find({
                type: new RegExp(type, 'i')
            }).lean();
            
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
                sweetness: w.sweetness || 0
            }));
        } catch (error) {
            console.error('타입별 위스키 조회 실패:', error);
            return [];
        }
    }
}

export default WhiskeyRecommendationService;
