// Mock 데이터 및 상태 관리
class WhiskeyApp {
    constructor() {
        this.currentUserId = 'user001';
        this.activeTab = 'recommend';
        this.loading = false;
        this.error = null;
        this.mockWhiskeys = [
            {
                id: 'w001',
                name: '맥캘란 18년',
                type: '싱글 몰트',
                distillery: '맥캘란',
                country: '스코틀랜드',
                age: 18,
                price: 450000,
                flavorProfile: ['쉐리', '견과류', '스파이스', '초콜릿'],
                description: '쉐리 캐스크에서 숙성된 프리미엄 스코틀랜드 위스키로, 풍부한 과일향과 견과류의 향이 어우러집니다.',
                imageUrl: ''
            },
            {
                id: 'w002',
                name: '라가불린 16년',
                type: '싱글 몰트',
                distillery: '라가불린',
                country: '스코틀랜드',
                age: 16,
                price: 180000,
                flavorProfile: ['피트', '스모키', '바다', '약초'],
                description: '아일라 섬의 대표적인 피티드 위스키로, 강렬한 스모키함과 바다의 염분기가 특징입니다.',
                imageUrl: ''
            },
            {
                id: 'w003',
                name: '글렌피딕 12년',
                type: '싱글 몰트',
                distillery: '글렌피딕',
                country: '스코틀랜드',
                age: 12,
                price: 65000,
                flavorProfile: ['사과', '꿀', '바닐라', '부드러움'],
                description: '스페이사이드 지역의 클래식한 싱글 몰트로, 부드럽고 접근하기 쉬운 맛이 특징입니다.',
                imageUrl: ''
            },
            {
                id: 'w004',
                name: '잭 다니엘스 No.7',
                type: '버번',
                distillery: '잭 다니엘스',
                country: '미국',
                price: 45000,
                flavorProfile: ['바닐라', '카라멜', '오크', '부드러움'],
                description: '테네시 위스키의 대표주자로, 메이플 차콜 필터링으로 부드러운 맛을 자랑합니다.',
                imageUrl: ''
            },
            {
                id: 'w005',
                name: '조니워커 블루 라벨',
                type: '블렌디드',
                distillery: '조니워커',
                country: '스코틀랜드',
                price: 320000,
                flavorProfile: ['꿀', '견과류', '스모키', '크리미'],
                description: '희귀한 원액만을 사용한 최고급 블렌디드 위스키로, 복합적이고 균형잡힌 맛이 특징입니다.',
                imageUrl: ''
            }
        ];
        this.userPreferences = {
            bodyPreference: 3,
            richnessPreference: 3,
            smokinessPreference: 3,
            sweetnessPreference: 3,
            minPreferredPrice: 0,
            maxPreferredPrice: 200000,
            flavorKeywords: []
        };
        this.evaluatedWhiskeys = [];
        this.recentViews = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateRangeValues();
        // index 페이지가 아닌 경우에만 loadAllWhiskeys 호출
        // index 페이지는 서버에서 렌더링된 데이터를 사용
    }

    setupEventListeners() {
        // 탭 버튼들
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 추천 버튼
        const recommendBtn = document.getElementById('recommend-btn');
        if (recommendBtn) {
            recommendBtn.addEventListener('click', () => {
                this.handleRecommend();
            });
        }

        // 취향 저장 버튼
        const savePreferencesBtn = document.getElementById('save-preferences-btn');
        if (savePreferencesBtn) {
            savePreferencesBtn.addEventListener('click', () => {
                this.savePreferences();
            });
        }

        // 필터/정렬 관련
        const openFilterBtn = document.getElementById('open-filter-btn');
        if (openFilterBtn) {
            openFilterBtn.addEventListener('click', () => {
                this.openFilterSidebar();
            });
        }

        const closeFilterBtn = document.getElementById('close-filter-btn');
        if (closeFilterBtn) {
            closeFilterBtn.addEventListener('click', () => {
                this.closeFilterSidebar();
            });
        }

        const applyFilterBtn = document.getElementById('apply-filter-btn');
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        // 모달 관련
        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        const submitReviewBtn = document.getElementById('submit-review-btn');
        if (submitReviewBtn) {
            submitReviewBtn.addEventListener('click', () => {
                this.submitReview();
            });
        }

        // 모달 외부 클릭 시 닫기
        const whiskeyModal = document.getElementById('whiskey-modal');
        if (whiskeyModal) {
            whiskeyModal.addEventListener('click', (e) => {
                if (e.target.id === 'whiskey-modal') {
                    this.closeModal();
                }
            });
        }

        // 범위 슬라이더 값 업데이트
        this.setupRangeSliders();
    }

    setupRangeSliders() {
        const rangeInputs = [
            { id: 'body-pref', valueId: 'body-value' },
            { id: 'richness-pref', valueId: 'richness-value' },
            { id: 'smokiness-pref', valueId: 'smokiness-value' },
            { id: 'sweetness-pref', valueId: 'sweetness-value' },
            { id: 'min-price-pref', valueId: 'min-price-value', isPrice: true },
            { id: 'max-price-pref', valueId: 'max-price-value', isPrice: true },
            { id: 'overall-rating', valueId: 'overall-rating-value' },
            { id: 'body-rating', valueId: 'body-rating-value' },
            { id: 'richness-rating', valueId: 'richness-rating-value' },
            { id: 'smokiness-rating', valueId: 'smokiness-rating-value' },
            { id: 'sweetness-rating', valueId: 'sweetness-rating-value' }
        ];

        rangeInputs.forEach(({ id, valueId, isPrice }) => {
            const input = document.getElementById(id);
            const valueSpan = document.getElementById(valueId);
            
            if (input && valueSpan) {
                input.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    if (isPrice) {
                        valueSpan.textContent = value.toLocaleString() + '원';
                    } else {
                        valueSpan.textContent = value;
                    }
                });
            }
        });
    }

    updateRangeValues() {
        // 초기 값 설정 - 요소가 존재하는 경우에만 설정
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };

        setValue('body-value', '3');
        setValue('richness-value', '3');
        setValue('smokiness-value', '3');
        setValue('sweetness-value', '3');
        setValue('min-price-value', '0원');
        setValue('max-price-value', '200,000원');
        setValue('overall-rating-value', '3');
        setValue('body-rating-value', '3');
        setValue('richness-rating-value', '3');
        setValue('smokiness-rating-value', '3');
        setValue('sweetness-rating-value', '3');
    }

    switchTab(tabName) {
        // 모든 탭 버튼과 콘텐츠 비활성화
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // 선택된 탭 활성화
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        const tabContent = document.getElementById(`${tabName}-tab`);
        
        if (tabButton) {
            tabButton.classList.add('active');
        }
        
        if (tabContent) {
            tabContent.classList.add('active');
        }

        this.activeTab = tabName;

        // 탭별 데이터 로드
        if (tabName === 'evaluated') {
            this.loadEvaluatedWhiskeys();
        } else if (tabName === 'recent') {
            this.loadRecentViews();
        }
        // 'all' 탭은 서버에서 렌더링된 데이터를 사용하므로 여기서 로드하지 않음
    }

    showLoading() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.remove('hidden');
        }
        this.loading = true;
    }

    hideLoading() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }
        this.loading = false;
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        
        if (errorEl && errorText) {
            errorText.textContent = message;
            errorEl.classList.remove('hidden');
            
            // 5초 후 자동으로 숨기기
            setTimeout(() => {
                errorEl.classList.add('hidden');
            }, 5000);
        }
    }

    async handleRecommend() {
        const queryInput = document.getElementById('user-query');
        if (!queryInput) {
            this.showError('추천 입력창을 찾을 수 없습니다.');
            return;
        }
        
        const query = queryInput.value.trim();
        if (!query) {
            this.showError('질문을 입력해주세요.');
            return;
        }

        this.showLoading();

        try {
            // Mock 추천 로직
            await new Promise(resolve => setTimeout(resolve, 1000)); // 로딩 시뮬레이션
            
            const recommendations = this.mockRecommend(query);
            this.displayRecommendations(recommendations);
        } catch (error) {
            this.showError('추천을 가져오는 중 오류가 발생했습니다.');
        } finally {
            this.hideLoading();
        }
    }

    mockRecommend(query) {
        const lowerQuery = query.toLowerCase();
        let filtered = [...this.mockWhiskeys];

        // 간단한 키워드 매칭
        if (lowerQuery.includes('피트') || lowerQuery.includes('스모키')) {
            filtered = filtered.filter(w => 
                w.flavorProfile.some(f => f.includes('피트') || f.includes('스모키'))
            );
        }
        
        if (lowerQuery.includes('달콤') || lowerQuery.includes('부드러운')) {
            filtered = filtered.filter(w => 
                w.flavorProfile.some(f => f.includes('꿀') || f.includes('바닐라') || f.includes('부드러움'))
            );
        }

        if (lowerQuery.includes('싱글몰트')) {
            filtered = filtered.filter(w => w.type === '싱글 몰트');
        }

        // 가격 필터링
        const priceMatch = lowerQuery.match(/(\d+)만원/);
        if (priceMatch) {
            const maxPrice = parseInt(priceMatch[1]) * 10000;
            filtered = filtered.filter(w => w.price <= maxPrice);
        }

        // 최대 3개 추천
        const recommendations = filtered.slice(0, 3).map(whiskey => ({
            whiskey,
            reason: this.generateReason(whiskey, query)
        }));

        return recommendations;
    }

    generateReason(whiskey, query) {
        const lowerQuery = query.toLowerCase();
        let reason = `${whiskey.name}은(는) ${whiskey.description.split('.')[0]} 특징이 있습니다.`;
        
        if (lowerQuery.includes('달콤') && whiskey.flavorProfile.some(f => ['꿀', '바닐라'].includes(f))) {
            reason += ' 달콤한 맛을 선호하시는 분께 추천합니다.';
        }
        
        if (lowerQuery.includes('피트') && whiskey.flavorProfile.includes('피트')) {
            reason += ' 강렬한 피트향을 좋아하신다면 이 위스키는 탁월한 선택입니다.';
        }

        return reason;
    }

    displayRecommendations(recommendations) {
        const container = document.getElementById('recommendations-grid');
        const recommendationsContainer = document.getElementById('recommendations-container');
        
        if (!container || !recommendationsContainer) {
            this.showError('추천 결과를 표시할 수 없습니다.');
            return;
        }
        
        if (recommendations.length === 0) {
            this.showError('추천할 위스키를 찾을 수 없습니다.');
            return;
        }

        container.innerHTML = '';
        recommendations.forEach(rec => {
            const card = this.createWhiskeyCard(rec.whiskey, rec.reason);
            container.appendChild(card);
        });

        recommendationsContainer.classList.remove('hidden');
    }

    createWhiskeyCard(whiskey, reason = null) {
        const card = document.createElement('div');
        card.className = 'whiskey-card';
        card.onclick = () => this.openWhiskeyModal(whiskey);

        const flavorsHtml = whiskey.flavorProfile.map(flavor => 
            `<span class="flavor-tag">${flavor}</span>`
        ).join('');

        const reasonHtml = reason ? 
            `<div class="recommendation-reason">${reason}</div>` : '';

        card.innerHTML = `
            <div class="whiskey-image">🥃</div>
            <div class="whiskey-name">${whiskey.name}</div>
            <div class="whiskey-type">${whiskey.type} | ${whiskey.country}</div>
            <div class="whiskey-price">${whiskey.price.toLocaleString()}원</div>
            <div class="whiskey-description">${whiskey.description}</div>
            <div class="whiskey-flavors">${flavorsHtml}</div>
            ${reasonHtml}
        `;

        return card;
    }

    savePreferences() {
        const getElementValue = (id, defaultValue = 0) => {
            const element = document.getElementById(id);
            return element ? element.value : defaultValue;
        };

        const preferences = {
            bodyPreference: parseInt(getElementValue('body-pref', 3)),
            richnessPreference: parseInt(getElementValue('richness-pref', 3)),
            smokinessPreference: parseInt(getElementValue('smokiness-pref', 3)),
            sweetnessPreference: parseInt(getElementValue('sweetness-pref', 3)),
            minPreferredPrice: parseInt(getElementValue('min-price-pref', 0)),
            maxPreferredPrice: parseInt(getElementValue('max-price-pref', 200000)),
            flavorKeywords: getElementValue('flavor-keywords', '')
                .split(',').map(s => s.trim()).filter(s => s !== '')
        };

        this.userPreferences = preferences;
        alert('취향이 저장되었습니다!');
    }

    loadEvaluatedWhiskeys() {
        const container = document.getElementById('evaluated-container');
        if (!container) {
            return; // 컨테이너가 없으면 조용히 리턴
        }
        
        if (this.evaluatedWhiskeys.length === 0) {
            container.innerHTML = '<p class="empty-message">아직 평가한 위스키가 없습니다.</p>';
            return;
        }

        container.innerHTML = '';
        this.evaluatedWhiskeys.forEach(item => {
            const card = this.createEvaluatedWhiskeyCard(item);
            container.appendChild(card);
        });
    }

    createEvaluatedWhiskeyCard(item) {
        const card = document.createElement('div');
        card.className = 'evaluated-whiskey-card';

        const whiskeyCard = this.createWhiskeyCard(item.whiskey);
        card.appendChild(whiskeyCard);

        const details = document.createElement('div');
        details.className = 'evaluation-details';
        details.innerHTML = `
            <p><strong>총점:</strong> ${item.rating}/5</p>
            <p><strong>바디감:</strong> ${item.bodyRating}/5</p>
            <p><strong>풍미:</strong> ${item.richnessRating}/5</p>
            <p><strong>스모키함:</strong> ${item.smokinessRating}/5</p>
            <p><strong>단맛:</strong> ${item.sweetnessRating}/5</p>
            <p><strong>코멘트:</strong> ${item.reviewText}</p>
            <p class="evaluation-date">작성일: ${new Date(item.createdAt).toLocaleDateString()}</p>
        `;

        card.appendChild(details);
        return card;
    }

    loadRecentViews() {
        const container = document.getElementById('recent-container');
        if (!container) {
            return; // 컨테이너가 없으면 조용히 리턴
        }
        
        if (this.recentViews.length === 0) {
            container.innerHTML = '<p class="empty-message">최근 조회한 위스키가 없습니다.</p>';
            return;
        }

        container.innerHTML = '';
        this.recentViews.forEach(item => {
            const wrapper = document.createElement('div');
            const card = this.createWhiskeyCard(item.whiskey);
            
            const viewTime = document.createElement('p');
            viewTime.className = 'recent-view-time';
            viewTime.textContent = `조회 시간: ${new Date(item.viewedAt).toLocaleString()}`;
            
            card.appendChild(viewTime);
            wrapper.appendChild(card);
            container.appendChild(wrapper);
        });
    }

    loadAllWhiskeys() {
        const container = document.getElementById('all-whiskey-container');
        if (!container) {
            return; // 컨테이너가 없으면 조용히 리턴
        }
        
        container.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'whiskey-grid';

        this.mockWhiskeys.forEach(whiskey => {
            const card = this.createWhiskeyCard(whiskey);
            grid.appendChild(card);
        });

        container.appendChild(grid);
    }

    openFilterSidebar() {
        document.querySelector('.filter-sidebar').classList.add('open');
        document.querySelector('.main-container').classList.add('sidebar-open');
    }

    closeFilterSidebar() {
        document.querySelector('.filter-sidebar').classList.remove('open');
        document.querySelector('.main-container').classList.remove('sidebar-open');
    }

    applyFilters() {
        // Mock 필터링 구현
        alert('필터가 적용되었습니다!');
        this.closeFilterSidebar();
    }

    openWhiskeyModal(whiskey) {
        // 최근 본 위스키에 추가
        this.addToRecentViews(whiskey);

        const modal = document.getElementById('whiskey-modal');
        const title = document.getElementById('modal-title');
        const info = document.getElementById('modal-whiskey-info');

        if (!modal || !title || !info) {
            console.error('모달 요소를 찾을 수 없습니다.');
            return;
        }

        title.textContent = whiskey.name;
        
        const flavorsHtml = whiskey.flavorProfile.map(flavor => 
            `<span class="flavor-tag">${flavor}</span>`
        ).join('');

        info.innerHTML = `
            <div class="whiskey-card">
                <div class="whiskey-image">🥃</div>
                <div class="whiskey-name">${whiskey.name}</div>
                <div class="whiskey-type">${whiskey.type} | ${whiskey.country}</div>
                <div class="whiskey-price">${whiskey.price.toLocaleString()}원</div>
                <div class="whiskey-description">${whiskey.description}</div>
                <div class="whiskey-flavors">${flavorsHtml}</div>
                ${whiskey.age ? `<p><strong>숙성 연수:</strong> ${whiskey.age}년</p>` : ''}
                <p><strong>증류소:</strong> ${whiskey.distillery}</p>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.dataset.whiskeyId = whiskey.id;
    }

    closeModal() {
        const modal = document.getElementById('whiskey-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    submitReview() {
        const modal = document.getElementById('whiskey-modal');
        if (!modal || !modal.dataset.whiskeyId) {
            console.error('모달 또는 위스키 ID를 찾을 수 없습니다.');
            return;
        }

        const whiskeyId = modal.dataset.whiskeyId;
        const whiskey = this.mockWhiskeys.find(w => w.id === whiskeyId);
        
        if (!whiskey) return;

        const getElementValue = (id, defaultValue = 3) => {
            const element = document.getElementById(id);
            return element ? element.value : defaultValue;
        };

        const review = {
            whiskey: whiskey,
            rating: parseInt(getElementValue('overall-rating', 3)),
            bodyRating: parseInt(getElementValue('body-rating', 3)),
            richnessRating: parseInt(getElementValue('richness-rating', 3)),
            smokinessRating: parseInt(getElementValue('smokiness-rating', 3)),
            sweetnessRating: parseInt(getElementValue('sweetness-rating', 3)),
            reviewText: getElementValue('review-text', ''),
            createdAt: Date.now()
        };

        this.evaluatedWhiskeys.push(review);
        alert('평가가 저장되었습니다!');
        this.closeModal();

        // 평가한 위스키 탭으로 이동
        if (this.activeTab === 'evaluated') {
            this.loadEvaluatedWhiskeys();
        }
    }

    addToRecentViews(whiskey) {
        // 기존 기록 제거
        this.recentViews = this.recentViews.filter(item => item.whiskey.id !== whiskey.id);
        
        // 새로운 기록 추가 (맨 앞에)
        this.recentViews.unshift({
            whiskey: whiskey,
            viewedAt: Date.now()
        });

        // 최대 10개까지만 유지
        this.recentViews = this.recentViews.slice(0, 10);
    }
}

// 인증 관련 클래스 (간소화됨 - 백엔드에서 처리)
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        this.initializeUserDropdown();
        this.initializeToast();
    }

    initializeUserDropdown() {
        const userMenuToggle = document.getElementById('user-menu-toggle');
        const userDropdownMenu = document.getElementById('user-dropdown-menu');
        
        if (userMenuToggle && userDropdownMenu) {
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdownMenu.classList.toggle('hidden');
            });

            // 외부 클릭 시 드롭다운 닫기
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-dropdown')) {
                    userDropdownMenu.classList.add('hidden');
                }
            });
        }
    }

    initializeToast() {
        // 토스트 닫기 버튼 이벤트
        const toastClose = document.getElementById('toast-close');
        if (toastClose) {
            toastClose.addEventListener('click', () => {
                const toast = document.getElementById('toast-notification');
                if (toast) {
                    toast.classList.add('hidden');
                }
            });
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast-notification');
        const toastText = document.getElementById('toast-text');
        
        if (toast && toastText) {
            toastText.textContent = message;
            toast.className = `toast-notification ${type}`;
            toast.classList.remove('hidden');
            
            // 3초 후 자동으로 숨김
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }
    }
}

// 위스키 상세 정보 모달 열기 (DB에서 데이터 가져오기)
async function openWhiskeyDetail(whiskeyId) {
    try {
        const response = await fetch(`/api/whiskey/${whiskeyId}`);
        if (!response.ok) {
            throw new Error('위스키 정보를 가져올 수 없습니다.');
        }
        
        const whiskey = await response.json();
        
        const modal = document.getElementById('whiskey-modal');
        const title = document.getElementById('modal-title');
        const info = document.getElementById('modal-whiskey-info');

        if (!modal || !title || !info) {
            console.error('모달 요소를 찾을 수 없습니다.');
            return;
        }

        title.textContent = whiskey.name;
        
        info.innerHTML = `
            <div class="whiskey-detail-card">
                <div class="whiskey-image-large">
                    ${whiskey.image_path ? 
                        `<img src="${whiskey.image_path}" alt="${whiskey.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                         <div class="whiskey-placeholder-large" style="display:none;">🥃</div>` : 
                        `<div class="whiskey-placeholder-large">🥃</div>`
                    }
                </div>
                <div class="whiskey-detail-info">
                    <h3>${whiskey.name}</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>타입:</strong> ${whiskey.type || '미상'}
                        </div>
                        <div class="detail-item">
                            <strong>원산지:</strong> ${whiskey.origin || '미상'}
                        </div>
                        <div class="detail-item">
                            <strong>가격:</strong> ${whiskey.price.toLocaleString()}원
                        </div>
                        ${whiskey.age_years ? `<div class="detail-item"><strong>숙성 연수:</strong> ${whiskey.age_years}년</div>` : ''}
                        ${whiskey.alcohol ? `<div class="detail-item"><strong>알코올 도수:</strong> ${whiskey.alcohol}%</div>` : ''}
                    </div>
                    
                    <div class="flavor-profile-section">
                        <h4><i class="fas fa-palette"></i> 맛 프로파일</h4>
                        <div class="flavor-profile-grid">
                            <div class="flavor-item">
                                <span class="flavor-label">바디감</span>
                                <div class="flavor-bar">
                                    <div class="flavor-fill" style="width: ${(whiskey.body || 0) * 20}%"></div>
                                </div>
                                <span class="flavor-value">${whiskey.body || 0}/5</span>
                            </div>
                            <div class="flavor-item">
                                <span class="flavor-label">풍미</span>
                                <div class="flavor-bar">
                                    <div class="flavor-fill" style="width: ${(whiskey.richness || 0) * 20}%"></div>
                                </div>
                                <span class="flavor-value">${whiskey.richness || 0}/5</span>
                            </div>
                            <div class="flavor-item">
                                <span class="flavor-label">스모키</span>
                                <div class="flavor-bar">
                                    <div class="flavor-fill" style="width: ${(whiskey.smoke || 0) * 20}%"></div>
                                </div>
                                <span class="flavor-value">${whiskey.smoke || 0}/5</span>
                            </div>
                            <div class="flavor-item">
                                <span class="flavor-label">단맛</span>
                                <div class="flavor-bar">
                                    <div class="flavor-fill" style="width: ${(whiskey.sweetness || 0) * 20}%"></div>
                                </div>
                                <span class="flavor-value">${whiskey.sweetness || 0}/5</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.dataset.whiskeyId = whiskey.whiskey_id;
        
    } catch (error) {
        console.error('위스키 상세 정보 로드 중 오류:', error);
        alert('위스키 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new WhiskeyApp();
    new AuthManager();
});
