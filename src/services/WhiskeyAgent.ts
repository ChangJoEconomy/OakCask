import { Agentica } from "@agentica/core";
import OpenAI from "openai";
import typia from "typia";
import WhiskeyRecommendationService from './WhiskeyRecommendationService';

// structured_output을 위한 인터페이스 정의
interface IWhiskeyRecommendation {
    analysis: string;
    recommendations: Array<{
        id: string;
        name: string;
        price: number;
        age: number;
        origin: string;
        type: string;
        scores: {
            body: number;
            richness: number;
            smoke: number;
            sweetness: number;
        };
        reason: string;
    }>;
    summary: string;
}

class WhiskeyAgent {
    private agent: any;

    constructor() {
        this.agent = new Agentica({
            vendor: {
                api: new OpenAI({ 
                    apiKey: process.env.OPENAI_API_KEY 
                }),
                model: "gpt-4o-mini",
            },
            controllers: [
                typia.llm.controller(
                    "whiskey_database",
                    new WhiskeyRecommendationService(),
                ),
            ],
            structured_output: typia.json.schemas<[IWhiskeyRecommendation]>(),
        });
    }

    async getRecommendation(userQuery: string) {
        try {
            console.log('사용자 질문:', userQuery);
            
            const systemPrompt = `
당신은 전문 위스키 추천 AI입니다. whiskey_database 컨트롤러를 활용해 사용자 질문에 맞는 위스키를 추천하세요.

사용 가능한 함수들:
- getAllWhiskeys(): 모든 위스키 조회
- getWhiskeysByPriceRange(minPrice, maxPrice): 가격대별 검색
- getWhiskeysByFlavorProfile(body, richness, smoke, sweetness, tolerance): 맛별 검색
- getWhiskeysByOrigin(origin): 원산지별 검색  
- getWhiskeysByType(type): 타입별 검색

반드시 함수를 호출해서 실제 데이터를 검색한 후, 아래 JSON 형식으로 응답하세요:

{
  "analysis": "질문 분석 결과 (한글, 100자)",
  "recommendations": [
    {
      "id": "위스키ID",
      "name": "위스키명",
      "price": 가격,
      "age": 숙성연수,
      "origin": "원산지", 
      "type": "타입",
      "scores": {"body": 점수, "richness": 점수, "smoke": 점수, "sweetness": 점수},
      "reason": "추천 이유 (80자)"
    }
  ],
  "summary": "추천 요약 (150자)"
}

사용자 질문: "${userQuery}"
`;

            const response = await this.agent.conversate(systemPrompt);
            console.log('AI 응답:', response);
            
            return this.parseRecommendation(response);
        } catch (error) {
            console.error('Agentica 추천 오류:', error);
            throw new Error(`AI 추천 서비스 오류: ${(error as Error).message}`);
        }
    }

    private parseRecommendation(response: any) {
        try {
            // structured_output으로 인해 응답은 이미 파싱된 자바스크립트 객체입니다.
            const parsed = response as IWhiskeyRecommendation;
            
            return {
                success: true,
                analysis: parsed.analysis || '분석 완료',
                recommendations: parsed.recommendations || [],
                summary: parsed.summary || '추천 완료',
                message: parsed.analysis + ' ' + parsed.summary
            };
            
        } catch (error) {
            console.error('응답 파싱 오류:', error);
            return {
                success: false,
                analysis: '응답 처리 오류',
                recommendations: [],
                summary: '다시 시도해주세요',
                message: 'AI 응답을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
            };
        }
    }
}

export default WhiskeyAgent;
