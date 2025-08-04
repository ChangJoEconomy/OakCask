require('dotenv').config();
const WhiskeyAgent = require('./services/WhiskeyAgent');

async function testCacheIssue() {
    try {
        console.log('=== 캐시 문제 디버깅 ===');
        const agent = new WhiskeyAgent();
        
        const query = "8만원에서 10만원 사이 위스키 추천해달라";
        console.log('질문:', query);
        
        // 1. 복잡도 분석
        const complexity = agent.analyzeQueryComplexity(query);
        console.log('\n1. 복잡도 분석:');
        console.log('   복잡함:', complexity.isComplex ? 'YES' : 'NO');
        console.log('   맛 키워드:', complexity.flavorWords);
        console.log('   지표:', Object.entries(complexity.indicators)
            .filter(([key, value]) => value)
            .map(([key]) => key)
            .join(', ') || '없음');
        
        // 2. 추천 시도
        console.log('\n2. 추천 시도:');
        const result = await agent.getRecommendation(query);
        
        console.log('   성공:', result.success);
        console.log('   분석:', result.analysis);
        console.log('   추천 개수:', result.recommendations.length);
        
        if (result.recommendations.length > 0) {
            console.log('\n3. 추천 결과:');
            result.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec.name} - ${rec.price}원`);
            });
        } else {
            console.log('\n3. 추천 결과: 없음');
        }
        
    } catch (error) {
        console.error('테스트 오류:', error);
    }
}

testCacheIssue();
