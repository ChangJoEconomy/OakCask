require('dotenv').config();
const WhiskeyAgent = require('./services/WhiskeyAgent');

async function testAgenticaTiming() {
    try {
        console.log('=== Agentica 성능 테스트 ===');
        const agent = new WhiskeyAgent();
        
        const query = "10만원 이하이면서 스모키하고 바디감이 강한 스코틀랜드 위스키를 추천해줘";
        console.log('질문:', query);
        
        // 전체 시간 측정
        const totalStart = Date.now();
        
        // 복잡도 분석 시간
        const complexityStart = Date.now();
        const complexity = agent.analyzeQueryComplexity(query);
        const complexityTime = Date.now() - complexityStart;
        console.log(`\n복잡도 분석 시간: ${complexityTime}ms`);
        console.log('복잡도 결과:', complexity.isComplex);
        
        if (complexity.isComplex) {
            // Agentica 호출 시간
            const agenticaStart = Date.now();
            const result = await agent.getAgenticaRecommendation(query);
            const agenticaTime = Date.now() - agenticaStart;
            console.log(`\nAgentica 처리 시간: ${agenticaTime}ms (${(agenticaTime/1000).toFixed(1)}초)`);
            
            const totalTime = Date.now() - totalStart;
            console.log(`전체 처리 시간: ${totalTime}ms (${(totalTime/1000).toFixed(1)}초)`);
            
            console.log('\n=== 결과 ===');
            console.log('성공:', result.success);
            console.log('추천 개수:', result.recommendations.length);
        } else {
            // 빠른 모드 시간
            const fastStart = Date.now();
            const result = await agent.getFastRecommendation(query, complexity);
            const fastTime = Date.now() - fastStart;
            console.log(`\n빠른 모드 처리 시간: ${fastTime}ms`);
        }
        
    } catch (error) {
        console.error('테스트 오류:', error);
    }
}

// 간단한 질문도 테스트
async function testSimpleQuery() {
    try {
        console.log('\n=== 간단한 질문 테스트 ===');
        const agent = new WhiskeyAgent();
        
        const simpleQuery = "부드러운 위스키 추천해줘";
        console.log('질문:', simpleQuery);
        
        const start = Date.now();
        const result = await agent.getRecommendation(simpleQuery);
        const time = Date.now() - start;
        
        console.log(`처리 시간: ${time}ms (${(time/1000).toFixed(1)}초)`);
        console.log('추천 개수:', result.recommendations.length);
        
    } catch (error) {
        console.error('간단한 질문 테스트 오류:', error);
    }
}

async function runTests() {
    await testAgenticaTiming();
    await testSimpleQuery();
}

runTests();
