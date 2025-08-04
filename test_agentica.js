require('dotenv').config();
const WhiskeyAgent = require('./services/WhiskeyAgent');

async function testAgentica() {
    try {
        console.log('Agentica 테스트 시작...');
        const agent = new WhiskeyAgent();
        
        const query = "10만원 이하이면서 스모키하고 바디감이 강한 스코틀랜드 위스키를 추천해줘";
        console.log('질문:', query);
        
        const result = await agent.getRecommendation(query);
        console.log('\n=== 결과 ===');
        console.log('성공:', result.success);
        console.log('분석:', result.analysis);
        console.log('요약:', result.summary);
        console.log('추천 개수:', result.recommendations.length);
        
        result.recommendations.forEach((rec, index) => {
            console.log(`\n${index + 1}. ${rec.name}`);
            console.log(`   가격: ${rec.price}원`);
            console.log(`   이유: ${rec.reason}`);
            console.log(`   점수: 바디${rec.scores.body} 풍부함${rec.scores.richness} 스모키${rec.scores.smoke} 단맛${rec.scores.sweetness}`);
        });
        
    } catch (error) {
        console.error('테스트 오류:', error);
    }
}

testAgentica();
