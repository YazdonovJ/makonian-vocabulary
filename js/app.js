// Main application JavaScript - Makonian Vocabulary Platform

class MakonianApp {
    constructor(vocabularyData, unitMetadata) {
        this.currentSection = 'home';
        
        // State for Word Navigation
        this.currentViewedUnit = null;
        this.currentViewedIndex = 0;

        this.quizState = {
            questions: [],
            currentQuestion: 0,
            score: 0,
            type: 'definition',
            unit: 'random'
        };

        // Data Storage
        this.vocabularyData = vocabularyData;
        this.unitMetadata = unitMetadata;

        this.userProgress = this.loadProgress();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSection('home');
        this.updateStats();
        this.setupSearch();
        
        // Initialize Theme (Default to Dark/Futuristic)
        const savedTheme = localStorage.getItem('theme') || 'dark'; // Defaulting to dark for the futuristic look
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Populate quiz dropdown
        this.populateQuizDropdown();

        // Hide loading screen after initialization
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.style.display = 'none', 500);
            }
        }, 800);
    }

    setupEventListeners() {
        // Main Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Handle clicking icon or span inside button
                const target = e.target.closest('.nav-btn');
                const section = target.dataset.section;
                this.loadSection(section);
            });
        });

        // Dark Mode Toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                this.toggleDarkMode();
            });
        }

        // View Toggles (Grid/List)
        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (gridViewBtn) gridViewBtn.addEventListener('click', () => this.setUnitView('grid'));
        if (listViewBtn) listViewBtn.addEventListener('click', () => this.setUnitView('list'));

        // Quiz Start
        const startQuizBtn = document.getElementById('start-quiz-btn');
        if (startQuizBtn) startQuizBtn.addEventListener('click', () => this.startQuiz());

        // Search Input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }
        
        // Close Modals on X click
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Close the specific modal this button belongs to
                const modal = e.target.closest('.modal');
                if (modal) modal.classList.remove('active');
            });
        });
    }

    loadSection(section) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        // Show target
        const target = document.getElementById(section);
        if (target) target.classList.add('active');

        // Update Nav State
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        this.currentSection = section;

        // Lazy Load Logic
        if (section === 'units') this.renderUnits();
        if (section === 'quiz') this.setupQuiz();
        if (section === 'progress') this.renderProgress();
    }

    // --- UNITS LOGIC ---

    renderUnits() {
        const container = document.getElementById('units-container');
        if (!container) return;

        const viewType = localStorage.getItem('unitView') || 'grid';
        container.className = viewType === 'grid' ? 'units-grid' : 'units-list'; // Update CSS class if you have list styles
        container.innerHTML = "";

        // Loop through metadata
        this.unitMetadata.forEach(unit => {
            const card = document.createElement('div');
            card.className = 'unit-card';
            card.onclick = () => this.openUnitModal(unit.number);

            const progress = this.getUnitProgress(unit.number);

            card.innerHTML = `
                <div class="unit-header">
                    <span class="unit-number">UNIT ${unit.number}</span>
                    <span class="unit-progress">${progress}%</span>
                </div>
                <h3 class="unit-title">${unit.title}</h3>
                <p class="unit-description">${unit.description}</p>
                <div class="unit-words-preview">
                    ${this.getUnitWordsPreview(unit.number)}
                </div>
            `;
            container.appendChild(card);
        });
    }

    getUnitProgress(unitNumber) {
        const progress = this.userProgress.unitProgress[unitNumber] || {};
        const unitData = this.vocabularyData[unitNumber - 1];
        if (!unitData) return 0;

        const total = unitData.length;
        const mastered = progress.mastered || 0;
        return Math.round((mastered / total) * 100);
    }

    getUnitWordsPreview(unitNumber) {
        const words = this.vocabularyData[unitNumber - 1];
        if (!words) return '';
        // Show first 4 words as tags
        return words.slice(0, 4).map(w => `<span class="word-tag">${w.word}</span>`).join("");
    }

    openUnitModal(unitNumber) {
        const modal = document.getElementById('unit-modal');
        const words = this.vocabularyData[unitNumber - 1];
        const info = this.unitMetadata[unitNumber - 1];

        if (!words || !info) return;

        document.getElementById('modal-unit-title').textContent = `Unit ${unitNumber}: ${info.title}`;

        // Render grid of words inside modal
        const list = document.getElementById('modal-words-list');
        list.innerHTML = "";

        words.forEach((word, index) => {
            const el = document.createElement('div');
            el.className = 'word-item';
            
            const wordKey = `${unitNumber}-${index}`;
            const status = this.userProgress.wordProgress[wordKey] || 'new';

            el.innerHTML = `
                <div class="word-header">
                    <span class="word-text">${word.word}</span>
                    <span class="word-status ${status}" data-word="${wordKey}">${status}</span>
                </div>
                <p class="word-definition-short">${word.definition}</p>
            `;
            el.onclick = () => this.openWordModal(word, unitNumber, index);
            list.appendChild(el);
        });

        // Setup Footer Buttons
        const studyBtn = document.getElementById('study-unit-btn');
        const newStudy = studyBtn.cloneNode(true);
        studyBtn.parentNode.replaceChild(newStudy, studyBtn);
        
        newStudy.onclick = () => {
            // Keep unit modal open in background, open word modal on top
            if(words.length > 0) this.openWordModal(words[0], unitNumber, 0);
        };

        const quizBtn = document.getElementById('quiz-unit-btn');
        const newQuiz = quizBtn.cloneNode(true);
        quizBtn.parentNode.replaceChild(newQuiz, quizBtn);
        
        newQuiz.onclick = () => {
            document.getElementById('unit-modal').classList.remove('active');
            this.loadSection('quiz');
            this.startQuiz(unitNumber); // Force quiz for this unit
        };

        modal.classList.add('active');
    }

    // --- WORD MODAL LOGIC ---

    openWordModal(word, unitNumber, wordIndex) {
        const modal = document.getElementById('word-modal');

        // Populate Data
        document.getElementById('word-title').textContent = word.word;
        document.getElementById('word-definition').textContent = word.definition;
        document.getElementById('word-example').textContent = `"${word.example}"`;

        const synList = document.getElementById('word-synonyms');
        synList.innerHTML = word.synonyms.map(s => `<span class="synonym-tag">${s}</span>`).join("");

        // State Management
        this.currentViewedUnit = unitNumber;
        this.currentViewedIndex = wordIndex;
        const wordKey = `${unitNumber}-${wordIndex}`;

        // Update Buttons (Visuals & Logic)
        this.updateWordButtonsUI(wordKey);
        this.setupWordButtonsLogic(wordKey);

        // Setup Navigation
        this.setupWordNavigation(unitNumber, wordIndex);

        // Setup Audio
        const audioBtn = document.getElementById('audio-btn');
        const newAudio = audioBtn.cloneNode(true);
        audioBtn.parentNode.replaceChild(newAudio, audioBtn);
        newAudio.onclick = () => this.playAudio(word.word);

        modal.classList.add('active');
    }

    playAudio(text) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = 'en-US';
        ut.rate = 0.9;
        window.speechSynthesis.speak(ut);
    }

    updateWordButtonsUI(wordKey) {
        const status = this.userProgress.wordProgress[wordKey];
        const isFav = this.userProgress.favorites.includes(wordKey);

        const diffBtn = document.getElementById('mark-difficult');
        const mastBtn = document.getElementById('mark-mastered');
        const favBtn = document.getElementById('add-to-favorites');

        // Remove active classes
        diffBtn.classList.remove('active');
        mastBtn.classList.remove('active');
        favBtn.classList.remove('active');

        // Reset Text
        diffBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Difficult';
        mastBtn.innerHTML = '<i class="fas fa-check-circle"></i> Mastered';
        favBtn.innerHTML = '<i class="far fa-heart"></i> Favorite';

        // Apply State
        if (status === 'difficult') {
            diffBtn.classList.add('active');
            diffBtn.innerHTML = '<i class="fas fa-check"></i> Marked Difficult';
        }
        if (status === 'mastered') {
            mastBtn.classList.add('active');
            mastBtn.innerHTML = '<i class="fas fa-check-double"></i> Mastered';
        }
        if (isFav) {
            favBtn.classList.add('active');
            favBtn.innerHTML = '<i class="fas fa-heart"></i> Favorited';
        }
    }

    setupWordButtonsLogic(wordKey) {
        const diffBtn = document.getElementById('mark-difficult');
        const mastBtn = document.getElementById('mark-mastered');
        const favBtn = document.getElementById('add-to-favorites');

        // Clone to clear listeners
        const d = diffBtn.cloneNode(true); diffBtn.parentNode.replaceChild(d, diffBtn);
        const m = mastBtn.cloneNode(true); mastBtn.parentNode.replaceChild(m, mastBtn);
        const f = favBtn.cloneNode(true); favBtn.parentNode.replaceChild(f, favBtn);

        d.onclick = () => this.setWordStatus(wordKey, 'difficult');
        m.onclick = () => this.setWordStatus(wordKey, 'mastered');
        f.onclick = () => this.toggleFavorite(wordKey);
    }

    setWordStatus(wordKey, status) {
        // Logic: If clicking the same status, toggle it off (back to 'new')
        // Otherwise set to new status
        const current = this.userProgress.wordProgress[wordKey];
        const newStatus = (current === status) ? 'new' : status;

        this.userProgress.wordProgress[wordKey] = newStatus;
        
        // Update UI
        this.updateWordButtonsUI(wordKey);
        this.saveProgress();
        this.updateStats();

        // Update list badge if visible
        const badge = document.querySelector(`.word-status[data-word="${wordKey}"]`);
        if (badge) {
            badge.className = `word-status ${newStatus}`;
            badge.textContent = newStatus;
        }
    }

    toggleFavorite(wordKey) {
        const idx = this.userProgress.favorites.indexOf(wordKey);
        if (idx > -1) this.userProgress.favorites.splice(idx, 1);
        else this.userProgress.favorites.push(wordKey);
        
        this.updateWordButtonsUI(wordKey);
        this.saveProgress();
    }

    setupWordNavigation(unitNum, idx) {
        const prev = document.getElementById('prev-word-btn');
        const next = document.getElementById('next-word-btn');
        const total = this.vocabularyData[unitNum - 1].length;

        prev.disabled = (idx === 0);
        next.disabled = (idx === total - 1);

        const p = prev.cloneNode(true); prev.parentNode.replaceChild(p, prev);
        const n = next.cloneNode(true); next.parentNode.replaceChild(n, next);

        p.onclick = () => this.openWordModal(this.vocabularyData[unitNum-1][idx-1], unitNum, idx-1);
        n.onclick = () => this.openWordModal(this.vocabularyData[unitNum-1][idx+1], unitNum, idx+1);
    }


    // --- QUIZ LOGIC ---

    populateQuizDropdown() {
        const select = document.getElementById('quiz-unit-select');
        if (!select) return;
        
        // Keep default options, append units
        this.unitMetadata.forEach(u => {
            const op = document.createElement('option');
            op.value = u.number;
            op.textContent = `Unit ${u.number}: ${u.title}`;
            select.appendChild(op);
        });
    }

    setupQuiz() {
        const container = document.getElementById('quiz-content');
        container.innerHTML = `
            <div class="quiz-welcome">
                <i class="fas fa-brain" style="font-size:4rem; color:var(--neon-violet); margin-bottom:1rem;"></i>
                <h2>Ready to test your skills?</h2>
                <p>Configure settings above and click Initialize.</p>
                <button class="primary-btn" style="margin-top:2rem;" onclick="app.startQuiz()">Initialize Quiz</button>
            </div>
        `;
    }

    startQuiz(forcedUnit = null) {
        const unitSel = document.getElementById('quiz-unit-select');
        const typeSel = document.getElementById('quiz-type');

        let unit = 'random';
        if (forcedUnit) {
            unit = forcedUnit.toString();
            if (unitSel) unitSel.value = unit;
        } else if (unitSel) {
            unit = unitSel.value;
        }

        this.quizState.unit = unit;
        this.quizState.type = typeSel ? typeSel.value : 'definition';
        this.quizState.currentQuestion = 0;
        this.quizState.score = 0;

        this.generateQuestions();

        if (this.quizState.questions.length === 0) {
            alert("No words found for this selection. Try 'All Words' or a different unit.");
            return;
        }
        this.renderQuestion();
    }

    generateQuestions() {
        let pool = [];
        const u = this.quizState.unit;

        if (u === 'random' || u === 'all') {
            this.vocabularyData.forEach(arr => pool.push(...arr));
        } else if (u === 'difficult') {
            for (const [key, status] of Object.entries(this.userProgress.wordProgress)) {
                if (status === 'difficult') {
                    const [un, wn] = key.split('-').map(Number);
                    if(this.vocabularyData[un-1]) pool.push(this.vocabularyData[un-1][wn]);
                }
            }
            if (pool.length < 5) { // Fallback if not enough difficult words
                 this.vocabularyData.forEach(arr => pool.push(...arr));
            }
        } else {
            // Specific unit
            const num = parseInt(u);
            if (this.vocabularyData[num - 1]) pool = [...this.vocabularyData[num - 1]];
        }

        pool = this.shuffle(pool).slice(0, 15); // 15 Question Quiz
        
        this.quizState.questions = pool.map(word => {
            return {
                word: word,
                correct: this.quizState.type === 'synonym' ? word.synonyms[0] : word.definition,
                options: this.generateOptions(word, this.quizState.type)
            };
        });
    }

    generateOptions(word, type) {
        const opts = [type === 'synonym' ? word.synonyms[0] : word.definition];
        const distractors = this.getRandomWords(3, word.word);
        
        distractors.forEach(d => {
            opts.push(type === 'synonym' ? (d.synonyms[0] || "Similar meaning") : d.definition);
        });
        
        return this.shuffle(opts);
    }

    renderQuestion() {
        const q = this.quizState.questions[this.quizState.currentQuestion];
        const container = document.getElementById('quiz-content');
        
        // Escaping for safety
        const escape = (s) => s.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        let questionText = "";
        if(this.quizState.type === 'definition') questionText = `What is the definition of <strong style="color:var(--neon-blue)">${q.word.word}</strong>?`;
        else if(this.quizState.type === 'synonym') questionText = `What is a synonym for <strong style="color:var(--neon-pink)">${q.word.word}</strong>?`;
        else if(this.quizState.type === 'spelling') questionText = `Which is the correct spelling for: "${q.word.definition}"?`;

        container.innerHTML = `
            <div class="quiz-question">
                <div class="question-header" style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <span>Question ${this.quizState.currentQuestion + 1} / ${this.quizState.questions.length}</span>
                    <span style="color:var(--neon-violet)">Score: ${this.quizState.score}</span>
                </div>
                <div class="question-text">${questionText}</div>
                <div class="quiz-options">
                    ${q.options.map(opt => `
                        <div class="quiz-option" onclick="app.handleAnswer(this, '${escape(opt)}')">${opt}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    handleAnswer(el, ans) {
        if (el.classList.contains('correct') || el.classList.contains('incorrect')) return; // Prevent double clicks
        
        const q = this.quizState.questions[this.quizState.currentQuestion];
        // Synonyms often have multiple valid ones, but for this simple engine we check exact string match against the generated option
        // Since we shuffled options, we just compare text.
        
        let isCorrect = (ans === q.correct);
        
        // Extra check for synonym arrays
        if(this.quizState.type === 'synonym' && q.word.synonyms.includes(ans)) isCorrect = true;

        if (isCorrect) {
            el.classList.add('correct');
            this.quizState.score++;
        } else {
            el.classList.add('incorrect');
            // Show correct one
            document.querySelectorAll('.quiz-option').forEach(opt => {
                if (opt.innerText === q.correct || (this.quizState.type === 'synonym' && q.word.synonyms.includes(opt.innerText))) {
                    opt.classList.add('correct');
                }
            });
        }

        setTimeout(() => {
            this.quizState.currentQuestion++;
            if (this.quizState.currentQuestion < this.quizState.questions.length) {
                this.renderQuestion();
            } else {
                this.showResults();
            }
        }, 1200);
    }

    showResults() {
        const pct = Math.round((this.quizState.score / this.quizState.questions.length) * 100);
        const container = document.getElementById('quiz-content');
        
        // Update stats
        this.userProgress.quizAttempts++;
        // Simple moving average
        const oldAvg = this.userProgress.averageScore || 0;
        this.userProgress.averageScore = Math.round(((oldAvg * (this.userProgress.quizAttempts - 1)) + pct) / this.userProgress.quizAttempts);
        this.saveProgress();
        this.updateStats();

        container.innerHTML = `
            <div class="quiz-results" style="text-align:center;">
                <h2 style="font-size:2rem; margin-bottom:1rem;">Session Complete</h2>
                <div class="progress-circle" style="margin:2rem auto;">
                    <div class="progress-text" style="position:relative; top:0; transform:none;">
                        <span style="font-size:4rem; color:var(--neon-blue)">${pct}%</span>
                    </div>
                </div>
                <p>You scored ${this.quizState.score} out of ${this.quizState.questions.length}</p>
                <div style="margin-top:2rem; display:flex; gap:1rem; justify-content:center;">
                    <button class="primary-btn" onclick="app.startQuiz('${this.quizState.unit}')">Retry</button>
                    <button class="secondary-btn" onclick="navigateToSection('units')">Back to Units</button>
                </div>
            </div>
        `;
    }

    // --- PROGRESS & UTILS ---

    renderProgress() {
        // Progress Circle
        const total = 1235; // Fixed total based on your data
        let mastered = 0;
        let difficult = 0;
        
        Object.values(this.userProgress.wordProgress).forEach(status => {
            if (status === 'mastered') mastered++;
            if (status === 'difficult') difficult++;
        });

        const pct = Math.round((mastered / total) * 100);
        
        const pctEl = document.getElementById('progress-percentage');
        if (pctEl) pctEl.textContent = `${pct}%`;

        const circle = document.getElementById('progress-circle');
        if (circle) {
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (pct / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }

        // Text Stats
        document.getElementById('words-mastered').textContent = mastered;
        document.getElementById('quiz-attempts').textContent = this.userProgress.quizAttempts;

        // Render Difficult List
        const list = document.getElementById('difficult-words-list');
        list.innerHTML = "";
        
        if (difficult === 0) {
            list.innerHTML = "<p style='color:var(--text-muted)'>No difficult words yet.</p>";
        } else {
            for (const [key, status] of Object.entries(this.userProgress.wordProgress)) {
                if (status === 'difficult') {
                    const [u, w] = key.split('-').map(Number);
                    if (this.vocabularyData[u-1] && this.vocabularyData[u-1][w]) {
                        const word = this.vocabularyData[u-1][w];
                        const tag = document.createElement('span');
                        tag.className = 'difficult-word-tag';
                        tag.textContent = word.word;
                        tag.onclick = () => this.openWordModal(word, u, w);
                        list.appendChild(tag);
                    }
                }
            }
        }
        
        // Render Chart (Chart.js)
        this.renderChart();
    }

    renderChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx || typeof Chart === 'undefined') return;

        // Mock data for demo - in real app, track daily stats
        if (this.chartInstance) this.chartInstance.destroy();
        
        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Words Learned',
                    data: [5, 12, 8, 20, 15, 10, this.userProgress.unitProgress[1] ? this.userProgress.unitProgress[1].mastered : 0],
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: {display: false} },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    performSearch(query) {
        const container = document.getElementById('units-container');
        if (!query) {
            this.renderUnits();
            return;
        }
        
        container.className = 'units-grid';
        container.innerHTML = "";
        
        const q = query.toLowerCase();
        let found = false;

        this.vocabularyData.forEach((unit, uIdx) => {
            unit.forEach((word, wIdx) => {
                if (word.word.toLowerCase().includes(q)) {
                    found = true;
                    const el = document.createElement('div');
                    el.className = 'word-item';
                    el.style.background = 'var(--glass-bg)';
                    el.innerHTML = `
                        <div class="word-header">
                            <span class="word-text">${word.word}</span>
                            <span class="word-status">Unit ${uIdx+1}</span>
                        </div>
                        <p class="word-definition-short">${word.definition}</p>
                    `;
                    el.onclick = () => this.openWordModal(word, uIdx+1, wIdx);
                    container.appendChild(el);
                }
            });
        });

        if (!found) container.innerHTML = "<p>No matches found.</p>";
    }

    // --- SYSTEM UTILS ---

    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    getRandomWords(count, exclude) {
        const pool = [];
        // Sample from first 5 units to be fast
        for(let i=0; i<5; i++) pool.push(...this.vocabularyData[i]);
        return this.shuffle(pool.filter(w => w.word !== exclude)).slice(0, count);
    }

    loadProgress() {
        const saved = localStorage.getItem('userProgress');
        return saved ? JSON.parse(saved) : {
            wordProgress: {},
            unitProgress: {},
            quizAttempts: 0,
            averageScore: 0,
            streak: 0,
            lastStudyDate: null,
            favorites: []
        };
    }

    saveProgress() {
        localStorage.setItem('userProgress', JSON.stringify(this.userProgress));
    }

    updateStats() {
        const completed = Object.values(this.userProgress.unitProgress).filter(u => u.completed).length;
        
        const el1 = document.getElementById('completed-units');
        if(el1) el1.textContent = completed;
        
        const el2 = document.getElementById('study-streak');
        if(el2) el2.textContent = this.userProgress.streak;
        
        const el3 = document.getElementById('quiz-score');
        if(el3) el3.textContent = (this.userProgress.averageScore || 0) + '%';
    }

    toggleDarkMode() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    }
    
    setUnitView(type) {
        localStorage.setItem('unitView', type);
        this.renderUnits();
        // Toggle active button states
        document.getElementById('grid-view-btn').classList.toggle('active', type === 'grid');
        document.getElementById('list-view-btn').classList.toggle('active', type === 'list');
    }

    // Actions
    continueStudying() {
        this.loadSection('units');
        this.openUnitModal(1);
    }
    takeQuickQuiz() {
        this.loadSection('quiz');
        this.startQuiz();
    }
    reviewDifficultWords() {
        this.loadSection('progress');
        window.scrollTo(0, document.body.scrollHeight);
    }
    exportProgress() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.userProgress));
        const node = document.createElement('a');
        node.setAttribute("href", dataStr);
        node.setAttribute("download", "makonian_data.json");
        document.body.appendChild(node);
        node.click();
        node.remove();
    }
}

// --- GLOBAL HOOKS ---
const app = new MakonianApp(vocabularyData, unitMetadata);

// Expose functions for HTML onclick events
window.navigateToSection = (s) => app.loadSection(s);
window.continueStudying = () => app.continueStudying();
window.takeQuickQuiz = () => app.takeQuickQuiz();
window.reviewDifficultWords = () => app.reviewDifficultWords();
window.exportProgress = () => app.exportProgress();

// Click outside to close modals
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
};
