require('dotenv').config({ override: true });
const { Agentica, assertHttpController } = require("@agentica/core");
const OpenAI = require("openai").OpenAI;
const WhiskeyRecommendationService = require('./WhiskeyRecommendationService');

// 간단한 LRU 캐시 (Agentica 결과 캐시용)
class SimpleLRUCache {
	constructor(maxEntries = 200, ttlMs = 5 * 60 * 1000) {
		this.maxEntries = maxEntries;
		this.ttlMs = ttlMs;
		this.map = new Map();
	}

	get(key) {
		const entry = this.map.get(key);
		if (!entry) return null;
		if (Date.now() > entry.expiresAt) {
			this.map.delete(key);
			return null;
		}
		// recency 갱신
		this.map.delete(key);
		this.map.set(key, entry);
		return entry.value;
	}

	set(key, value) {
		const entry = { value, expiresAt: Date.now() + this.ttlMs };
		if (this.map.has(key)) this.map.delete(key);
		this.map.set(key, entry);
		if (this.map.size > this.maxEntries) {
			const firstKey = this.map.keys().next().value;
			this.map.delete(firstKey);
		}
	}
}

class WhiskeyAgent {
    constructor() {
        this.whiskeyService = new WhiskeyRecommendationService();
        const apiKey = (process.env.OPENAI_API_KEY || '').trim();
        console.log('[AI] OPENAI_API_KEY loaded:', apiKey.length > 0);
        this.openai = new OpenAI({ 
            apiKey
        });
        this.whiskeyCache = null;
        this.agenticaCache = new SimpleLRUCache(200, 5 * 60 * 1000);
        
        // Agentica 설정 (복잡한 조건용)
        this.setupAgentica();
    }

    // Fast 모드 보강: 추천 결과가 limit 미만이면 후보에서 조건에 맞는 항목을 추가하여 정확히 limit개를 맞춘다
    ensureFastLimit(recommendations, candidates, limit, userQuery) {
        if (!Array.isArray(recommendations)) return [];
        const uniqById = new Set(recommendations.map(r => r.id));

        // 이미 포함된 항목 제외한 후보 구성
        const remaining = (candidates || []).filter(c => !uniqById.has(c.id));

        // 간단한 관련성 점수: 키워드 일치 + 가격 근접 + 맛 프로필 힌트
        const lowerQuery = (userQuery || '').toLowerCase();
        const score = (w) => {
            let s = 0;
            if (lowerQuery.includes('스모키') || lowerQuery.includes('피트')) s += (w.smoke || 0) * 2;
            if (lowerQuery.includes('부드러운')) s += (5 - (w.smoke || 0)) + (3 - Math.abs((w.body || 0) - 2));
            if (lowerQuery.includes('달콤')) s += (w.sweetness || 0) * 2;
            if (lowerQuery.includes('라이트')) s += (5 - (w.body || 0));
            if (lowerQuery.includes('풍부')) s += (w.richness || 0);
            // 가격 키워드가 있다면 대략적인 상한 고려
            const pm = lowerQuery.match(/(\d+)만원|((\d{5,}))원/);
            if (pm) {
                const maxP = pm[1] ? parseInt(pm[1]) * 10000 : parseInt(pm[2]);
                if (w.price && maxP) s += (w.price <= maxP ? 2 : 0);
            }
            return s;
        };

        const sorted = remaining
            .map(w => ({ w, s: score(w) }))
            .sort((a, b) => b.s - a.s)
            .map(x => x.w);

        const need = Math.max(0, limit - recommendations.length);
        const fillers = sorted.slice(0, need).map(w => ({
            id: w.id,
            name: w.name,
            price: w.price,
            age: w.age,
            origin: w.origin,
            type: w.type,
            image_path: w.image_path || '',
            scores: { body: w.body, richness: w.richness, smoke: w.smoke, sweetness: w.sweetness },
            reason: '부족한 수를 후보에서 보강'
        }));

        const finalList = [...recommendations, ...fillers].slice(0, limit);
        console.log(`⚙️ Fast 보강 결과: 원본 ${recommendations.length}개 + 보강 ${fillers.length}개 = 최종 ${finalList.length}개`);
        return finalList;
    }

    setupAgentica() {
        const swaggerDoc = {
            openapi: "3.0.0",
            info: { title: "Whiskey Database API", version: "1.0.0" },
            servers: [{ url: "http://localhost:3000" }],
            paths: {
                "/api/whiskey-db/price": {
                    get: {
                        operationId: "getWhiskeysByPriceRange",
                        summary: "가격대별 위스키 검색",
                        parameters: [
                            { name: "minPrice", in: "query", required: true, schema: { type: "number" } },
                            { name: "maxPrice", in: "query", required: true, schema: { type: "number" } }
                        ],
                        responses: { "200": { description: "성공" } }
                    }
                },
                "/api/whiskey-db/flavor": {
                    get: {
                        operationId: "getWhiskeysByFlavorProfile",
                        summary: "맛 프로필별 위스키 검색",
                        parameters: [
                            { name: "body", in: "query", required: true, schema: { type: "number" } },
                            { name: "richness", in: "query", required: true, schema: { type: "number" } },
                            { name: "smoke", in: "query", required: true, schema: { type: "number" } },
                            { name: "sweetness", in: "query", required: true, schema: { type: "number" } },
                            { name: "tolerance", in: "query", required: false, schema: { type: "number", default: 1 } }
                        ],
                        responses: { "200": { description: "성공" } }
                    }
                },
                "/api/whiskey-db/origin": {
                    get: {
                        operationId: "getWhiskeysByOrigin",
                        summary: "원산지별 위스키 검색",
                        parameters: [
                            { name: "origin", in: "query", required: true, schema: { type: "string" } }
                        ],
                        responses: { "200": { description: "성공" } }
                    }
                }
            }
        };

        const apiKey = (process.env.OPENAI_API_KEY || '').trim();
        this.agent = new Agentica({
            vendor: {
                api: new OpenAI({ apiKey }),
                model: "gpt-4.1-mini",
            },
            controllers: [
                assertHttpController({
                    name: "whiskey_database",
                    model: "chatgpt",
                    document: swaggerDoc,
                    connection: { host: "http://localhost:3000" }
                })
            ],
        });
    }

    async getRecommendation(userQuery, limit = 10) {
        try {
            const t0 = Date.now();
            console.log('사용자 질문:', userQuery);
            
            // 1. 질문 복잡도 분석
            const complexity = this.analyzeQueryComplexity(userQuery);
            console.log('질문 복잡도:', complexity);
            
            const t1 = Date.now();
            if (complexity.isComplex) {
                // 복잡한 조건 → Agentica 사용 (실패시 Fast 모드로 fallback)
                try {
                    const a0 = Date.now();
                    return await this.getAgenticaRecommendation(userQuery, limit);
                } catch (agenticaError) {
                    console.warn('🚨 Agentica 실패, 빠른 모드로 전환:', agenticaError.message);
                    const f0 = Date.now();
                    const out = await this.getFastRecommendation(userQuery, complexity, limit);
                    const f1 = Date.now();
                    console.log(`⏱️ Fast fallback 소요: ${f1 - f0}ms (분석: ${t1 - t0}ms)`);
                    return out;
                }
            } else {
                // 간단한 조건 → 빠른 로컬 처리
                const f0 = Date.now();
                const out = await this.getFastRecommendation(userQuery, complexity, limit);
                const f1 = Date.now();
                console.log(`⏱️ Fast 전체 소요: ${f1 - f0}ms (분석: ${t1 - t0}ms)`);
                return out;
            }
        } catch (error) {
            console.error('AI 추천 오류:', error);
            throw new Error(`AI 추천 서비스 오류: ${error.message}`);
        }
    }

    analyzeQueryComplexity(query) {
        const lowerQuery = query.toLowerCase();
        
        // 맛 관련 키워드 확장 (어근 중심)
        const flavorKeywords = [
            '부드러운', '달콤한', '스모키', '피트', '풍부한', '라이트', '드라이', 
            '과일', '꽃', '허브', '스파이시', '바디감', '단맛', '쓴맛', '신맛',
            '부드럽', '달콤', '스모키', '피트', '풍부', '가볍', '무겁',
            '깔끔', '진한', '연한', '강한', '약한', '복잡', '단순'
        ];
        
        // 중복 제거된 키워드 매칭
        const matched = new Set();
        flavorKeywords.forEach(keyword => {
            if (lowerQuery.includes(keyword)) {
                // 대표 키워드로 그룹화 (예: '달콤한', '달콤' -> 'sweet')
                if (['달콤한', '달콤'].includes(keyword)) matched.add('sweet');
                else if (['스모키', '피트'].includes(keyword)) matched.add('smoky');
                else if (['부드러운', '부드럽'].includes(keyword)) matched.add('smooth');
                else matched.add(keyword);
            }
        });
        const flavorMatches = Array.from(matched);
        const flavorWords = flavorMatches.length;
        
        console.log('감지된 맛 키워드 그룹:', flavorMatches);
        
        // 복잡도 지표들
        const complexityIndicators = {
            multipleFlavorWords: flavorWords >= 2,
            hasConjunctions: /그리고|하면서|동시에|또한|하지만|그러나|면서|이면서|고\s|하고\s/.test(lowerQuery),
            hasSpecificNumbers: /\d+점|점수|정확히|정도/.test(lowerQuery),
            hasComparisons: /보다|같은|비슷한|다른|대신|말고/.test(lowerQuery),
            hasComplexConditions: /범위|사이|이상|이하|정도|약|대략/.test(lowerQuery),
            hasMultipleConditions: [
                /(\d+)만원|(\d+)원/.test(lowerQuery),
                flavorWords > 0,
                /스코틀랜드|아일랜드|일본|미국|캐나다/.test(lowerQuery)
            ].filter(Boolean).length >= 2,
            hasComplexFlavorCombination: /부드럽고\s*달콤|달콤하고\s*부드럽|스모키하고\s*바디감|바디감.*강한/.test(lowerQuery)
        };
        
        const complexCount = Object.values(complexityIndicators).filter(Boolean).length;
        
        // 복잡도 판단 로직 강화
        const isComplex = 
            flavorWords >= 2 ||
            (flavorWords >= 1 && complexityIndicators.hasConjunctions) || // 맛 + 연결어
            complexityIndicators.hasMultipleConditions ||
            complexityIndicators.hasComplexFlavorCombination ||
            complexityIndicators.hasComplexConditions || // "사이", "이상" 등 범위/조건 단독으로도 복잡한 쿼리로 처리
            complexCount >= 2;
        
        // 간단한 조건들 파악
        const simpleConditions = {
            hasPrice: /(\d+)만원|(\d+)원/.test(lowerQuery),
            hasOrigin: /스코틀랜드|아일랜드|일본|미국|캐나다/.test(lowerQuery),
            hasSingleFlavor: flavorWords === 1 && !complexityIndicators.hasConjunctions
        };
        
        return {
            isComplex,
            complexCount,
            flavorWords,
            flavorMatches, // 디버깅용
            indicators: complexityIndicators,
            simpleConditions,
            query: lowerQuery
        };
    }

    async getAgenticaRecommendation(userQuery, limit = 10) {
        console.log('🤖 Agentica 모드: 복잡한 조건 처리');
        const cacheKey = `ag:${limit}:${userQuery.trim()}`;
        const cached = this.agenticaCache.get(cacheKey);
        if (cached) {
            console.log('🧠 Agentica 캐시 히트');
            return cached;
        }
        
        const systemPrompt = `
위스키 추천 AI입니다. whiskey_database 함수들을 사용해 사용자 요청에 맞는 위스키를 찾아 추천하세요.

사용 가능한 함수:
- getWhiskeysByPriceRange(minPrice, maxPrice): 가격대별 검색
- getWhiskeysByFlavorProfile(body, richness, smoke, sweetness, tolerance): 맛 프로필별 검색
  * body: 바디감 (0-5), richness: 풍부함 (0-5), smoke: 스모키 (0-5), sweetness: 단맛 (0-5)
  * tolerance: 허용 오차 (1-2 권장, 너무 엄격하면 결과 없음)
- getWhiskeysByOrigin(origin): 원산지별 검색

검색 전략:
1. 가격 조건이 있으면 먼저 가격대별 검색 사용
2. 맛 프로필 검색 시 tolerance를 1-2로 설정하여 유연하게 검색
3. 빈 결과가 나오면 조건을 완화하여 재검색
4. 여러 조건을 조합하여 최적의 결과 도출

반드시 지킬 사항:
- 사용자가 요청한 정확한 개수만큼 추천하세요(적거나 많지 않게).
- 출력은 JSON 객체만 작성하세요(추가 텍스트 금지).
- 가급적 한 번의 API 호출로 충분히 후보를 수집하고, 부족한 경우에만 1회 완화 재검색 후 종료하세요(총 execute 최대 2회).
- 최종 결과는 id 목록과 이유만 반환하세요.

반환 JSON 형식(엄격):
{
  "analysis": "질문 분석 (50자)",
  "ids": ["ID1", "ID2", "..."],
  "reasons": { "ID1": "추천 이유 (40자)", "ID2": "..." },
  "summary": "추천 요약 (60자)"
}

사용자 질문: "${userQuery}"
`;

        // 호출 상한을 프롬프트로도 명시
        const promptTail = `\n\n요청 사항: 조건에 가장 적합한 위스키를 정확히 ${limit}개 추천하세요. 반드시 ${limit}개를 모두 추천해야 합니다.\n` +
            `검색은 가급적 단일 호출로 충분히 수집하고, 결과가 부족할 때에만 1회 완화 재검색하세요(총 execute 최대 2회).\n` +
            `출력은 위 JSON 스키마만 사용하세요.`;

        const response = await this.agent.conversate(systemPrompt + promptTail);
        console.log('Agentica 응답 완료');
        
        const parsed = await this.parseAgenticaResponseIdsFirst(response, limit);
        // 캐시 저장(성공 시에만)
        if (parsed && parsed.success) this.agenticaCache.set(cacheKey, parsed);
        return parsed;
    }

    async getFastRecommendation(userQuery, complexity, limit = 10) {
        const T0 = Date.now();
        console.log('⚡ 빠른 모드: 간단한 조건 처리');
        
        // 캐시 로드 (전체 로드 대신 샘플 기반으로 초기화)
        const C0 = Date.now();
        if (!this.whiskeyCache) {
            console.log('위스키 데이터 캐시 로드 중...');
            const sampledWhiskeys = await this.whiskeyService.getSampleWhiskeys(300);
            this.whiskeyCache = this.smartSampling(sampledWhiskeys, 120);
            console.log(`캐시 완료: ${this.whiskeyCache.length}개`);
        }
        const C1 = Date.now();

        // 빠른 필터링
        const F0 = Date.now();
        const relevantWhiskeys = this.filterRelevantWhiskeys(userQuery, this.whiskeyCache, limit);
        const F1 = Date.now();

        // 후보 페이로드 슬림화(id/name/핵심스코어/가격/원산지/타입)
        const candidateView = relevantWhiskeys.map(w => ({
            id: w.id,
            name: w.name,
            price: w.price,
            origin: w.origin,
            type: w.type,
            scores: {
                body: w.body || 0,
                richness: w.richness || 0,
                smoke: w.smoke || 0,
                sweetness: w.sweetness || 0
            }
        }));
        // 상세 정보 매핑(이미지 포함)
        const fullDetailsMap = new Map(relevantWhiskeys.map(w => [w.id, w]));
        
        const systemPrompt = `
위스키 추천 AI입니다. 아래 후보 목록에서 사용자 질문에 가장 잘 맞는 위스키를 정확히 ${limit}개 선택해 추천하세요.

중요 지침:
- 반드시 ${limit}개의 위스키를 추천하세요(적거나 많지 않게).
- 출력은 반드시 JSON 객체만 반환하세요(추가 텍스트 금지).
- 아래 후보는 간소화된 정보입니다. 선택은 id를 기준으로 하되, 이유는 간결히 작성하세요.

후보 목록(간소화):
${JSON.stringify(candidateView, null, 2)}

반환 JSON 형식(엄격):
{
  "analysis": "질문 분석 (30자)",
  "ids": ["ID1", "ID2", "ID3", "..."],
  "reasons": { "ID1": "선정 이유(25자)", "ID2": "..." },
  "summary": "요약 (40자)"
}

질문: "${userQuery}"
`;

        // 요청 개수에 따라 max_tokens 동적 조정
        const maxTokens = Math.max(1000, limit * 150 + 500); // 위스키당 150토큰 + 기본 500토큰
        console.log(`⚡ 빠른 모드 설정: 요청 ${limit}개, max_tokens: ${maxTokens}, 후보 위스키: ${relevantWhiskeys.length}개`);
        
        const O0 = Date.now();
        const response = await this.openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [{ role: "system", content: systemPrompt }],
            temperature: 0.7,
            max_tokens: maxTokens,
            response_format: { type: "json_object" }
        });
        const O1 = Date.now();

        const aiResponse = response.choices[0].message.content;
        console.log(`🤖 OpenAI 응답 길이: ${aiResponse.length}자`);
        console.log(`🤖 OpenAI 응답 끝부분 확인:`, aiResponse.slice(-200));

        const P0 = Date.now();
        const parsed = this.parseFastRecommendation(aiResponse, limit, fullDetailsMap);
        const P1 = Date.now();
        if (!parsed.success) {
            return parsed;
        }

        // AI가 요청 개수보다 적게 추천한 경우, 후보 풀이에서 자동 보강하여 정확히 limit개를 맞춘다
        const topped = this.ensureFastLimit(parsed.recommendations, relevantWhiskeys, limit, userQuery);
        const T1 = Date.now();
        console.log(`⏱️ Fast 단계별(ms) 캐시:${C1 - C0} 필터:${F1 - F0} 프롬프트+호출:${O1 - O0} 파싱:${P1 - P0} 총:${T1 - T0}`);
        return { ...parsed, recommendations: topped };
    }

    filterRelevantWhiskeys(query, whiskeys, limit = 10) {
        const lowerQuery = query.toLowerCase();
        console.log('필터링 시작:', lowerQuery);
        
        // 가격 관련 키워드 추출 (범위 지원)
        let minPrice = null;
        let maxPrice = null;
        
        // "X만원에서 Y만원 사이" 패턴
        const rangeMatch = query.match(/(\d+)만원에서\s*(\d+)만원/);
        if (rangeMatch) {
            minPrice = parseInt(rangeMatch[1]) * 10000;
            maxPrice = parseInt(rangeMatch[2]) * 10000;
        } else {
            // 단일 가격 패턴
            const priceMatch = query.match(/(\d+)만원|(\d+)원/);
            if (priceMatch) {
                if (priceMatch[1]) maxPrice = parseInt(priceMatch[1]) * 10000;
                if (priceMatch[2]) maxPrice = parseInt(priceMatch[2]);
            }
        }
        
        console.log('추출된 가격 범위:', minPrice, '-', maxPrice);
        
        // 맛 관련 키워드
        const flavorKeywords = {
            '부드러운': w => w.smoke <= 2 && w.body <= 3,
            '달콤한': w => w.sweetness >= 3,
            '스모키': w => w.smoke >= 3,
            '피트': w => w.smoke >= 4,
            '풍부한': w => w.richness >= 4,
            '라이트': w => w.body <= 2
        };
        
        // 원산지 키워드
        const originKeywords = {
            '스코틀랜드': 'Scotland',
            '아일랜드': 'Ireland',
            '일본': 'Japan',
            '미국': 'USA'
        };
        
        let filtered = [...whiskeys];
        console.log('초기 위스키 개수:', filtered.length);
        
        // 가격 필터링
        if (minPrice && maxPrice) {
            // 범위 필터링
            filtered = filtered.filter(w => w.price >= minPrice && w.price <= maxPrice);
            console.log(`가격 필터링 후 (${minPrice}-${maxPrice}):`, filtered.length);
        } else if (maxPrice) {
            // 최대 가격만
            filtered = filtered.filter(w => w.price <= maxPrice);
            console.log('가격 필터링 후:', filtered.length);
        }
        
        // 맛 필터링
        let flavorApplied = false;
        for (const [keyword, condition] of Object.entries(flavorKeywords)) {
            if (lowerQuery.includes(keyword)) {
                filtered = filtered.filter(condition);
                console.log(`${keyword} 필터링 후:`, filtered.length);
                flavorApplied = true;
                break;
            }
        }
        
        // 원산지 필터링
        for (const [keyword, origin] of Object.entries(originKeywords)) {
            if (lowerQuery.includes(keyword)) {
                filtered = filtered.filter(w => w.origin === origin);
                console.log(`${keyword} 필터링 후:`, filtered.length);
                break;
            }
        }
        
        // 필터링 결과가 요청 개수보다 적으면 조건 완화
        const minRequired = Math.max(limit * 1.5, 10); // 요청의 1.5배 이상 또는 최소 10개
        if (filtered.length < minRequired) {
            console.log(`결과가 부족해서 조건 완화: ${filtered.length}개 → 요구사항: ${minRequired}개 이상`);
            filtered = whiskeys.slice(0, Math.max(20, limit * 2)); // 최소 20개 또는 limit의 2배
        }
        
        // 관련성 높은 순으로 정렬 후 AI가 선택할 수 있도록 충분한 후보 제공
        const maxCandidates = Math.max(15, limit * 1.5); // 최소 15개 또는 limit의 1.5배
        const result = filtered.slice(0, maxCandidates);
        console.log(`최종 반환 개수: ${result.length}개 (요청: ${limit}개)`);
        return result;
    }

    parseRecommendation(response, limit = 10) {
        let jsonMatch = null;
        try {
            // JSON 부분만 추출
            jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('JSON 형식을 찾을 수 없습니다');
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            const rawRecommendations = parsed.recommendations || [];
            const finalRecommendations = rawRecommendations.slice(0, limit);
            
            console.log(`📋 파싱 결과: AI가 추천한 개수 ${rawRecommendations.length}개, 최종 반환 ${finalRecommendations.length}개 (요청: ${limit}개)`);
            
            return {
                success: true,
                analysis: parsed.analysis || '분석 완료',
                recommendations: finalRecommendations,
                summary: parsed.summary || '추천 완료',
                message: (parsed.analysis || '분석 완료') + ' ' + (parsed.summary || '추천 완료')
            };
            
        } catch (error) {
            console.error('응답 파싱 오류:', error);
            console.error('파싱 실패한 응답:', response);
            console.error('JSON 매치 결과:', jsonMatch ? jsonMatch[0] : 'JSON 매치 실패');
            return {
                success: false,
                analysis: '응답 처리 오류',
                recommendations: [],
                summary: '다시 시도해주세요',
                message: `AI 응답을 처리하는 중 오류가 발생했습니다: ${error.message}`
            };
        }
    }

    // Fast 모드 JSON 전용 파서: { analysis, ids:[], reasons:{}, summary }
    parseFastRecommendation(response, limit, detailMap) {
        try {
            let text = response;
            // 일부 모델이 텍스트를 덧붙일 가능성 방지: 중괄호 블록만 추출 시도
            const m = text.match(/\{[\s\S]*\}/);
            if (m) text = m[0];
            const parsed = JSON.parse(text);

            const ids = Array.isArray(parsed.ids) ? parsed.ids.slice(0, limit) : [];
            const reasons = parsed.reasons || {};

            // id를 상세 객체로 치환
            const recs = ids
                .map(id => detailMap.get(id))
                .filter(Boolean)
                .map(w => ({
                    id: w.id,
                    name: w.name,
                    price: w.price,
                    age: w.age,
                    origin: w.origin,
                    type: w.type,
                    image_path: w.image_path || '',
                    scores: {
                        body: w.body ?? (w.scores?.body ?? 0),
                        richness: w.richness ?? (w.scores?.richness ?? 0),
                        smoke: w.smoke ?? (w.scores?.smoke ?? 0),
                        sweetness: w.sweetness ?? (w.scores?.sweetness ?? 0)
                    },
                    reason: reasons[w.id] || '선정'
                }));

            console.log(`📋 Fast(JSON) 파싱: ids ${ids.length}개, 매핑 ${recs.length}개`);
            return {
                success: true,
                analysis: parsed.analysis || '분석 완료',
                recommendations: recs,
                summary: parsed.summary || '추천 완료',
                message: (parsed.analysis || '분석 완료') + ' ' + (parsed.summary || '추천 완료')
            };
        } catch (e) {
            console.warn('⚠️ Fast(JSON) 파싱 실패, 구 파서로 폴백:', e.message);
            return this.parseRecommendation(response, limit);
        }
    }

    smartSampling(whiskeys, targetCount) {
        console.log('스마트 샘플링 시작...');
        
        // 1. 가격대별 분류 (5개 구간)
        const priceRanges = [
            { min: 0, max: 50000, name: '5만원 이하' },
            { min: 50000, max: 80000, name: '5-8만원' },
            { min: 80000, max: 120000, name: '8-12만원' },
            { min: 120000, max: 200000, name: '12-20만원' },
            { min: 200000, max: Infinity, name: '20만원 이상' }
        ];
        
        const sampled = [];
        const perCategory = Math.floor(targetCount / priceRanges.length);
        
        // 가격대별로 균등하게 샘플링
        priceRanges.forEach(range => {
            const inRange = whiskeys.filter(w => 
                w.price >= range.min && w.price < range.max
            );
            
            if (inRange.length > 0) {
                // 해당 가격대에서 다양한 타입과 원산지를 고려하여 선택
                const diverseSample = this.diverseSelection(inRange, perCategory);
                sampled.push(...diverseSample);
                console.log(`${range.name}: ${diverseSample.length}개 선택`);
            }
        });
        
        // 부족한 경우 랜덤으로 추가
        if (sampled.length < targetCount) {
            const remaining = whiskeys.filter(w => !sampled.includes(w));
            const additional = remaining
                .sort(() => Math.random() - 0.5)
                .slice(0, targetCount - sampled.length);
            sampled.push(...additional);
        }
        
        console.log(`스마트 샘플링 완료: ${sampled.length}개`);
        return sampled.slice(0, targetCount);
    }

    diverseSelection(whiskeys, count) {
        if (whiskeys.length <= count) return whiskeys;
        
        const selected = [];
        const typeGroups = {};
        const originGroups = {};
        
        // 타입별, 원산지별 그룹화
        whiskeys.forEach(w => {
            if (!typeGroups[w.type]) typeGroups[w.type] = [];
            if (!originGroups[w.origin]) originGroups[w.origin] = [];
            typeGroups[w.type].push(w);
            originGroups[w.origin].push(w);
        });
        
        // 다양성을 위해 각 그룹에서 균등하게 선택
        const types = Object.keys(typeGroups);
        const origins = Object.keys(originGroups);
        
        let typeIndex = 0;
        let originIndex = 0;
        
        while (selected.length < count && selected.length < whiskeys.length) {
            // 타입 기준으로 선택
            if (typeIndex < types.length) {
                const typeGroup = typeGroups[types[typeIndex]];
                const available = typeGroup.filter(w => !selected.includes(w));
                if (available.length > 0) {
                    selected.push(available[0]);
                }
                typeIndex++;
            }
            
            // 원산지 기준으로 선택
            if (selected.length < count && originIndex < origins.length) {
                const originGroup = originGroups[origins[originIndex]];
                const available = originGroup.filter(w => !selected.includes(w));
                if (available.length > 0 && !selected.includes(available[0])) {
                    selected.push(available[0]);
                }
                originIndex++;
            }
            
            // 모든 그룹을 순회했으면 리셋
            if (typeIndex >= types.length && originIndex >= origins.length) {
                typeIndex = 0;
                originIndex = 0;
                // 무한 루프 방지
                if (selected.length === 0) break;
            }
        }
        
        // 부족한 경우 랜덤으로 추가
        if (selected.length < count) {
            const remaining = whiskeys.filter(w => !selected.includes(w));
            selected.push(...remaining.slice(0, count - selected.length));
        }
        
        return selected.slice(0, count);
    }

    parseAgenticaResponse(response, limit = 10) {
        try {
            console.log('Agentica 응답 파싱 중...');
            console.log('원본 응답:', JSON.stringify(response, null, 2));
            
            let responseText = '';
            let apiResults = [];
            
            if (Array.isArray(response)) {
                console.log('응답이 배열입니다. 길이:', response.length);
                
                // API 호출 결과들 수집
                const executeMessages = response.filter(item => item.type === 'execute');
                console.log('API 호출 개수:', executeMessages.length);
                
                executeMessages.forEach(execute => {
                    if (execute.value && execute.value.body) {
                        try {
                            const apiData = JSON.parse(execute.value.body);
                            if (Array.isArray(apiData) && apiData.length > 0) {
                                apiResults.push(...apiData);
                                console.log(`API 결과 추가: ${apiData.length}개`);
                            }
                        } catch (e) {
                            console.log('API 결과 파싱 실패:', e.message);
                        }
                    }
                });
                
                // describe 메시지에서 분석 내용 추출
                const describeMessages = response.filter(item => item.type === 'describe');
                console.log('describe 메시지 개수:', describeMessages.length);
                if (describeMessages.length > 0) {
                    const lastDescribe = describeMessages[describeMessages.length - 1];
                    responseText = lastDescribe.text || '';
                    console.log('추출된 텍스트:', responseText.substring(0, 200) + '...');
                }
            }
            
            // API 결과가 있으면 이를 활용
            if (apiResults.length > 0) {
                console.log(`🤖 Agentica API 결과 활용: ${apiResults.length}개 위스키 발견 (요청: ${limit}개)`);
                
                const recommendations = apiResults.slice(0, limit).map(whiskey => ({
                    id: whiskey.id,
                    name: whiskey.name,
                    price: whiskey.price,
                    age: whiskey.age,
                    origin: whiskey.origin,
                    type: whiskey.type,
                    image_path: whiskey.image_path || '',
                    scores: {
                        body: whiskey.body,
                        richness: whiskey.richness,
                        smoke: whiskey.smoke,
                        sweetness: whiskey.sweetness
                    },
                    reason: this.generateReasonFromAnalysis(whiskey, responseText)
                }));
                
                console.log(`🤖 Agentica 최종 추천: ${recommendations.length}개 반환 (요청: ${limit}개)`);
                
                return {
                    success: true,
                    analysis: this.extractAnalysisFromText(responseText),
                    recommendations: recommendations,
                    summary: `${recommendations.length}개의 조건에 맞는 위스키를 찾았습니다`,
                    message: 'Agentica가 API를 통해 정확한 추천을 제공했습니다'
                };
            }

            // JSON 형식 찾기
            console.log('JSON 매칭 시도...');
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log('JSON 매치 발견:', jsonMatch[0]);
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log('JSON 파싱 성공:', parsed);
                    return {
                        success: true,
                        analysis: parsed.analysis || 'Agentica 분석 완료',
                        recommendations: (parsed.recommendations || []).slice(0, limit),
                        summary: parsed.summary || 'Agentica 추천 완료',
                        message: (parsed.analysis || 'Agentica 분석 완료') + ' ' + (parsed.summary || 'Agentica 추천 완료')
                    };
                } catch (jsonError) {
                    console.error('JSON 파싱 실패:', jsonError);
                }
            } else {
                console.log('JSON 매치 실패');
            }

            // 텍스트 기반 추천 시도
            console.log('텍스트 기반 추천 시도...');
            console.log('whiskey 키워드 포함:', responseText.toLowerCase().includes('whiskey'));
            console.log('whisky 키워드 포함:', responseText.toLowerCase().includes('whisky'));
            
            // 한국어 또는 영어 키워드 확인
            if (responseText.includes('위스키') || responseText.includes('추천') || 
                responseText.toLowerCase().includes('whiskey') || 
                responseText.toLowerCase().includes('whisky') ||
                responseText.toLowerCase().includes('laphroaig') ||
                responseText.toLowerCase().includes('macallan') ||
                responseText.toLowerCase().includes('scotland')) {
                console.log('키워드 매치 성공, 텍스트 기반 추천 생성');
                return {
                    success: true,
                    analysis: this.extractAnalysisFromText(responseText),
                    recommendations: this.extractRecommendationsFromAgenticaText(responseText, limit),
                    summary: 'Function calling을 통한 정확한 추천',
                    message: 'Agentica가 복잡한 조건을 분석했습니다'
                };
            }

            console.log('모든 파싱 시도 실패, 기본 추천 제공');
            // 파싱이 실패해도 기본 추천을 제공
            return {
                success: true,
                analysis: 'Agentica 응답을 처리하는 중 문제가 발생했지만 기본 추천을 제공합니다',
                recommendations: this.getDefaultRecommendations(limit),
                summary: '기본 추천 제공',
                message: 'Agentica 응답 처리 중 문제가 발생하여 기본 추천을 제공합니다'
            };
            
        } catch (error) {
            console.error('Agentica 응답 파싱 오류:', error);
            return {
                success: false,
                analysis: 'Agentica 응답 처리 오류',
                recommendations: [],
                summary: '다시 시도해주세요',
                message: 'Agentica 응답을 처리하는 중 오류가 발생했습니다.'
            };
        }
    }

    // Agentica 응답 파서(우선 ids/reasons JSON 사용, 실패 시 기존 로직 폴백)
    async parseAgenticaResponseIdsFirst(response, limit = 10) {
        try {
            // conversate 응답에서 describe 텍스트 또는 message 중 JSON 추출 시도
            let responseText = '';
            if (Array.isArray(response)) {
                const describeMessages = response.filter(item => item.type === 'describe');
                if (describeMessages.length > 0) {
                    responseText = describeMessages[describeMessages.length - 1].text || '';
                }
            } else if (typeof response === 'string') {
                responseText = response;
            }

            const match = responseText.match(/\{[\s\S]*\}/);
            if (!match) throw new Error('Agentica JSON 블록을 찾지 못함');
            const parsed = JSON.parse(match[0]);

            const ids = Array.isArray(parsed.ids) ? parsed.ids.slice(0, limit) : [];
            const reasons = parsed.reasons || {};

            if (ids.length === 0) throw new Error('ids 비어 있음');

            // ids를 상세 정보로 조합하기 위해 DB에서 조회
            // Agentica 경로에서는 수량이 크지 않으므로 1회 DB 조회로 상세 필드를 얻는다
            // WhiskeyRecommendationService에 전체 조회가 있어 샘플이 아닌 전체 중에서 매핑 시도
            // 안전을 위해 실패 시 간단 객체로 폴백
            let recs = [];
            try {
                // 가능한 많은 필드를 채우기 위해 전체 리스트(필요시 최적화 고려)
                const all = typeof this.whiskeyService.getAllWhiskeysLimited === 'function'
                    ? await this.whiskeyService.getAllWhiskeysLimited(1000)
                    : await this.whiskeyService.getAllWhiskeys();
                const map = new Map(all.map(w => [w.id, w]));
                recs = ids.map(id => {
                    const w = map.get(id);
                    return w ? {
                        id: w.id,
                        name: w.name,
                        price: w.price,
                        age: w.age,
                        origin: w.origin,
                        type: w.type,
                        image_path: w.image_path || '',
                        scores: { body: w.body || 0, richness: w.richness || 0, smoke: w.smoke || 0, sweetness: w.sweetness || 0 },
                        reason: reasons[id] || '선정'
                    } : {
                        id,
                        name: '',
                        price: null,
                        age: null,
                        origin: '',
                        type: '',
                        image_path: '',
                        scores: { body: 0, richness: 0, smoke: 0, sweetness: 0 },
                        reason: reasons[id] || '선정'
                    };
                });
            } catch (dbErr) {
                console.warn('⚠️ Agentica 상세 매핑 실패, 간단 객체로 폴백:', dbErr.message);
                recs = ids.map((id) => ({
                    id,
                    name: '',
                    price: null,
                    age: null,
                    origin: '',
                    type: '',
                    image_path: '',
                    scores: { body: 0, richness: 0, smoke: 0, sweetness: 0 },
                    reason: reasons[id] || '선정'
                }));
            }

            console.log(`📋 Agentica(JSON) 파싱: ids ${ids.length}개`);
            return {
                success: true,
                analysis: parsed.analysis || 'Agentica 분석 완료',
                recommendations: recs,
                summary: parsed.summary || 'Agentica 추천 완료',
                message: (parsed.analysis || 'Agentica 분석 완료') + ' ' + (parsed.summary || 'Agentica 추천 완료')
            };
        } catch (e) {
            console.warn('⚠️ Agentica(JSON) 우선 파싱 실패, 기존 파서로 폴백:', e.message);
            return this.parseAgenticaResponse(response, limit);
        }
    }

    extractAnalysisFromText(text) {
        // 텍스트에서 분석 내용 추출
        if (text.includes('price') && text.includes('smoke')) {
            return '가격대와 스모키한 맛을 고려한 분석';
        } else if (text.includes('price')) {
            return '가격대를 고려한 위스키 분석';
        } else if (text.includes('smoke') || text.includes('smoky')) {
            return '스모키한 맛 프로필 분석';
        } else if (text.includes('body') || text.includes('full-bodied')) {
            return '바디감을 중심으로 한 분석';
        } else if (text.includes('Scotland') || text.includes('Scottish')) {
            return '스코틀랜드 위스키 중심 분석';
        } else {
            return 'Agentica가 복합적 조건을 분석했습니다';
        }
    }

    generateReasonFromAnalysis(whiskey, analysisText) {
        const reasons = [];
        
        // 가격 관련
        if (whiskey.price < 80000) {
            reasons.push('합리적인 가격');
        } else if (whiskey.price < 100000) {
            reasons.push('적정 가격대');
        }
        
        // 맛 프로필 관련
        if (whiskey.smoke >= 4) {
            reasons.push('강한 스모키 향');
        } else if (whiskey.smoke >= 2) {
            reasons.push('적당한 스모키함');
        }
        
        if (whiskey.body >= 4) {
            reasons.push('풍부한 바디감');
        } else if (whiskey.body >= 3) {
            reasons.push('적당한 바디감');
        }
        
        if (whiskey.richness >= 4) {
            reasons.push('깊은 풍미');
        } else if (whiskey.richness >= 3) {
            reasons.push('균형잡힌 풍미');
        }
        
        if (whiskey.sweetness >= 3) {
            reasons.push('부드러운 단맛');
        } else if (whiskey.sweetness <= 1) {
            reasons.push('드라이한 맛');
        }
        
        // 숙성 관련
        if (whiskey.age >= 15) {
            reasons.push('오랜 숙성');
        } else if (whiskey.age >= 12) {
            reasons.push('충분한 숙성');
        }
        
        // 원산지 관련
        if (whiskey.origin === 'Scotland') {
            reasons.push('스코틀랜드 전통');
        }
        
        // 최대 3개 이유만 선택
        const selectedReasons = reasons.slice(0, 3);
        
        return selectedReasons.length > 0 
            ? selectedReasons.join(', ') + '이 특징'
            : 'Agentica가 조건에 맞춰 선택';
    }

    getDefaultRecommendations(limit = 10) {
        // 기본 추천 위스키들
        const defaults = [
            { 
                id: "W1", 
                name: "Tamdhu 12 Year Old", 
                price: 94100, 
                age: 12, 
                origin: "Scotland", 
                type: "SINGLE_MALT", 
                image_path: "/images/tamob.12yo.jpg",
                scores: { body: 2, richness: 3, smoke: 0, sweetness: 3 }, 
                reason: "부드럽고 균형잡힌 맛의 입문용 위스키" 
            },
            { 
                id: "W7", 
                name: "Laphroaig 10 Year Old", 
                price: 77400, 
                age: 10, 
                origin: "Scotland", 
                type: "SINGLE_MALT", 
                image_path: "/images/lrgob.10yov1.jpg",
                scores: { body: 3, richness: 5, smoke: 5, sweetness: 2 }, 
                reason: "강렬한 스모키 향이 특징인 아일레이 위스키" 
            },
            { 
                id: "W11", 
                name: "Glenmorangie Quinta Ruban 14 Year OldPort Finish", 
                price: 90300, 
                age: 14, 
                origin: "Scotland", 
                type: "SINGLE_MALT", 
                image_path: "/images/gmgob.14yo.jpg",
                scores: { body: 4, richness: 4, smoke: 0, sweetness: 3 }, 
                reason: "포트 와인 캐스크 피니시로 풍부한 맛" 
            }
        ];
        return defaults.slice(0, limit);
    }

    extractRecommendationsFromAgenticaText(text, limit = 10) {
        console.log('Agentica 텍스트에서 위스키 정보 추출 중...');
        const recommendations = [];
        
        // 테이블 형식에서 위스키 정보 추출
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 테이블 행 패턴 찾기 (| Name | Price | Age | Type | Body | Richness | Smoke | Sweetness |)
            if (line.includes('|') && !line.includes('Name') && !line.includes('---')) {
                const parts = line.split('|').map(p => p.trim()).filter(p => p);
                
                if (parts.length >= 7) {
                    const name = parts[0];
                    const priceStr = parts[1].replace(/,/g, '').replace(/[^\d]/g, '');
                    const ageStr = parts[2];
                    const type = parts[3];
                    const body = parseInt(parts[4]) || 0;
                    const richness = parseInt(parts[5]) || 0;
                    const smoke = parseInt(parts[6]) || 0;
                    const sweetness = parseInt(parts[7]) || 0;
                    
                    if (name && priceStr && name.length > 3) {
                        recommendations.push({
                            id: `AG_${recommendations.length + 1}`,
                            name: name,
                            price: parseInt(priceStr) || 0,
                            age: ageStr === 'N/A' ? null : parseInt(ageStr) || null,
                            origin: "Scotland",
                            type: type || "SINGLE_MALT",
                            scores: { body, richness, smoke, sweetness },
                            reason: "Agentica가 조건에 맞춰 선택한 위스키"
                        });
                    }
                }
            }
        }
        
        // 테이블에서 추출하지 못한 경우, 텍스트에서 위스키 이름 찾기
        if (recommendations.length === 0) {
            const knownWhiskeys = [
                { name: "Laphroaig 10 Year Old", price: 77400, age: 10, scores: { body: 3, richness: 5, smoke: 5, sweetness: 2 } },
                { name: "Tamdhu 12 Year Old", price: 94100, age: 12, scores: { body: 2, richness: 3, smoke: 0, sweetness: 3 } },
                { name: "Glenmorangie Quinta Ruban 14 Year Old", price: 90300, age: 14, scores: { body: 4, richness: 4, smoke: 0, sweetness: 3 } },
                { name: "Macallan 15 Year Old Double Cask", price: 278100, age: 15, scores: { body: 3, richness: 3, smoke: 0, sweetness: 3 } },
                { name: "Glendronach 15 Year Old", price: 153700, age: 15, scores: { body: 4, richness: 4, smoke: 0, sweetness: 4 } }
            ];
            
            knownWhiskeys.forEach((whiskey, index) => {
                if (text.toLowerCase().includes(whiskey.name.toLowerCase().split(' ')[0])) {
                    recommendations.push({
                        id: `AG_${index + 1}`,
                        name: whiskey.name,
                        price: whiskey.price,
                        age: whiskey.age,
                        origin: "Scotland",
                        type: "SINGLE_MALT",
                        scores: whiskey.scores,
                        reason: "Agentica가 조건에 맞춰 선택한 위스키"
                    });
                }
            });
        }
        
        console.log(`추출된 추천 개수: ${recommendations.length}`);
        return recommendations.slice(0, limit);
    }

    extractRecommendationsFromText(text, limit = 10) {
        // 텍스트에서 위스키 정보 추출 (간단한 버전)
        const recommendations = [];
        
        // 일반적인 위스키 패턴들
        const commonWhiskeys = [
            { id: "W7", name: "Laphroaig 10 Year Old", price: 77400, age: 10, origin: "Scotland", type: "SINGLE_MALT", scores: { body: 3, richness: 5, smoke: 5, sweetness: 2 }, reason: "Agentica가 선택한 스모키한 위스키" },
            { id: "W1", name: "Tamdhu 12 Year Old", price: 94100, age: 12, origin: "Scotland", type: "SINGLE_MALT", scores: { body: 2, richness: 3, smoke: 0, sweetness: 3 }, reason: "Agentica가 선택한 부드러운 위스키" },
            { id: "W11", name: "Glenmorangie Quinta Ruban 14 Year Old", price: 90300, age: 14, origin: "Scotland", type: "SINGLE_MALT", scores: { body: 4, richness: 4, smoke: 0, sweetness: 3 }, reason: "Agentica가 선택한 풍부한 위스키" }
        ];
        
        // 텍스트에 언급된 위스키들 찾기
        commonWhiskeys.forEach(whiskey => {
            if (text.toLowerCase().includes(whiskey.name.toLowerCase().split(' ')[0])) {
                recommendations.push(whiskey);
            }
        });
        
        return recommendations.slice(0, limit);
    }
}

module.exports = WhiskeyAgent;
