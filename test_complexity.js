require('dotenv').config();
const WhiskeyAgent = require('./services/WhiskeyAgent');

async function testComplexity() {
    const agent = new WhiskeyAgent();
    
    const testQueries = [
        "부드럽고 달콤한 위스키 추천해줘",
        "부드러운 위스키 추천해줘",
        "달콤한 위스키 추천해줘", 
        "10만원 이하이면서 스모키하고 바디감이 강한 스코틀랜드 위스키를 추천해줘",
        "스코틀랜드 위스키 추천해줘",
        "위스키 추천해줘"
    ];
    
    console.log('=== 복잡도 분석 테스트 ===\n');
    
    testQueries.forEach((query, index) => {
        console.log(`${index + 1}. "${query}"`);
        const complexity = agent.analyzeQueryComplexity(query);
        console.log(`   복잡함: ${complexity.isComplex ? '✅ YES' : '❌ NO'}`);
        console.log(`   맛 키워드 수: ${complexity.flavorWords}개`);
        console.log(`   감지된 키워드: [${complexity.flavorMatches?.join(', ')}]`);
        console.log(`   복잡도 점수: ${complexity.complexCount}`);
        console.log(`   지표:`, Object.entries(complexity.indicators)
            .filter(([key, value]) => value)
            .map(([key]) => key)
            .join(', ') || '없음');
        console.log('');
    });
}

testComplexity();
