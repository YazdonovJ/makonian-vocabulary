// Main application JavaScript

class MakonianApp {
    constructor(vocabularyData, unitMetadata) {
        this.currentSection = 'home';
        this.currentUnit = null;
        this.quizState = {
            questions: [],
            currentQuestion: 0,
            score: 0,
            type: 'definition',
            unit: 'random'
        };

        // Store data on the instance
        this.vocabularyData = vocabularyData;
        this.unitMetadata = unitMetadata;

        this.userProgress = this.loadProgress();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSection('home');
        this.updateStats();
        this.setupDarkMode();
        this.setupSearch();

        // Populate quiz dropdown with units dynamically
        this.populateQuizDropdown();

        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        }, 1000);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.loadSection(section);
            });
        });

        // Dark mode toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                this.toggleDarkMode();
            });
        }

        // Unit view toggle
        const gridViewBtn = document.getElementById('grid-view-btn');
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => {
                this.setUnitView('grid');
            });
        }

        const listViewBtn = document.getElementById('list-view-btn');
        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => {
                this.setUnitView('list');
            });
        }

        // Quiz controls
        const startQuizBtn = document.getElementById('start-quiz-btn');
        if (startQuizBtn) {
            startQuizBtn.addEventListener('click', () => {
                this.startQuiz();
            });
        }

        // Modal controls
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }
    }

    populateQuizDropdown() {
        const select = document.getElementById('quiz-unit-select');
        if (!select) return;
        
        // Keep static options (Random, Difficult, All)
        // Append specific units
        this.unitMetadata.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.number;
            option.textContent = `Unit ${unit.number}: ${unit.title}`;
            select.appendChild(option);
        });
    }

    loadSection(section) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

        // Show target section
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        this.currentSection = section;

        // Load section-specific content
        switch (section) {
            case 'units':
                this.renderUnits();
                break;
            case 'quiz':
                this.setupQuiz();
                break;
            case 'progress':
                this.renderProgress();
                break;
        }
    }

    renderUnits() {
        const container = document.getElementById('units-container');
        if (!container) return;

        const viewType = localStorage.getItem('unitView') || 'grid';
        container.className = viewType === 'grid' ? 'units-grid' : 'units-list';
        container.innerHTML = "";

        const units = JSON.parse(localStorage.getItem('unitMetadata')) || this.unitMetadata;

        units.forEach(unit => {
            const unitCard = this.createUnitCard(unit, viewType);
            container.appendChild(unitCard);
        });
    }

    createUnitCard(unit, viewType) {
        const card = document.createElement('div');
        card.className = 'unit-card fade-in';
        card.onclick = () => this.openUnitModal(unit.number);

        const progress = this.getUnitProgress(unit.number);

        card.innerHTML = `
            <div class="unit-header">
                <span class="unit-number">Unit ${unit.number}</span>
                <span class="unit-progress">${progress}%</span>
            </div>
            <h3 class="unit-title">${unit.title}</h3>
            <p class="unit-description">${unit.description}</p>
            <div class="unit-words-preview">
                ${this.getUnitWordsPreview(unit.number)}
            </div>
            <div class="unit-difficulty">
                <span class="difficulty-badge ${unit.difficulty}">${unit.difficulty}</span>
            </div>
        `;

        return card;
    }

    getUnitProgress(unitNumber) {
        const progress = this.userProgress.unitProgress[unitNumber] || {};
        const unitData = this.vocabularyData[unitNumber - 1];
        if (!unitData) return 0;

        const totalWords = unitData.length;
        const masteredWords = progress.mastered || 0;
        return Math.round((masteredWords / totalWords) * 100);
    }

    getUnitWordsPreview(unitNumber) {
        const words = this.vocabularyData[unitNumber - 1];
        if (!words) return '';
        return words.slice(0, 5).map(word =>
            `<span class="word-tag">${word.word}</span>`
        ).join("");
    }

    openUnitModal(unitNumber) {
        this.currentUnit = unitNumber;
        const modal = document.getElementById('unit-modal');
        const words = this.vocabularyData[unitNumber - 1];
        const unitInfo = this.unitMetadata[unitNumber - 1];

        if (!words || !unitInfo) return;

        document.getElementById('modal-unit-title').textContent = `Unit ${unitNumber}: ${unitInfo.title}`;

        const wordsList = document.getElementById('modal-words-list');
        wordsList.innerHTML = "";

        words.forEach((word, index) => {
            const wordElement = this.createWordElement(word, unitNumber, index);
            wordsList.appendChild(wordElement);
        });

        // --- FUNCTIONALITY FIX: Bind Buttons correctly ---

        // 1. Study Button: Opens the first word of this unit in the detail view
        const studyBtn = document.getElementById('study-unit-btn');
        const newStudyBtn = studyBtn.cloneNode(true); // Remove old listeners
        studyBtn.parentNode.replaceChild(newStudyBtn, studyBtn);
        
        newStudyBtn.onclick = () => {
            this.closeModal();
            if(words.length > 0) {
                this.openWordModal(words[0], unitNumber, 0);
            }
        };

        // 2. Quiz Button: Starts quiz for THIS specific unit
        const quizBtn = document.getElementById('quiz-unit-btn');
        const newQuizBtn = quizBtn.cloneNode(true); // Remove old listeners
        quizBtn.parentNode.replaceChild(newQuizBtn, quizBtn);

        newQuizBtn.onclick = () => {
            this.closeModal();
            this.loadSection('quiz');
            // Pass the unit number to startQuiz to force specific unit
            this.startQuiz(unitNumber); 
        };

        modal.classList.add('active');
    }

    createWordElement(word, unitNumber, wordIndex) {
        const wordEl = document.createElement('div');
        wordEl.className = 'word-item'; // Matches new CSS
        wordEl.onclick = () => this.openWordModal(word, unitNumber, wordIndex);

        const wordKey = `${unitNumber}-${wordIndex}`;
        const progress = this.userProgress.wordProgress[wordKey] || 'new';

        wordEl.innerHTML = `
            <div class="word-header">
                <span class="word-text">${word.word}</span>
                <span class="word-status ${progress}" data-word="${wordKey}">${progress}</span>
            </div>
            <p class="word-definition-short">${word.definition.substring(0, 80)}...</p>
            <div class="word-synonyms">
                ${word.synonyms.slice(0, 3).map(s => `<span class="synonym-tag">${s}</span>`).join("")}
            </div>
        `;

        return wordEl;
    }

    openWordModal(word, unitNumber, wordIndex) {
        const modal = document.getElementById('word-modal');

        document.getElementById('word-title').textContent = word.word;
        document.getElementById('word-definition').textContent = word.definition;

        const synonymsList = document.getElementById('word-synonyms');
        synonymsList.innerHTML = word.synonyms.map(s =>
            `<span class="synonym-tag">${s}</span>`
        ).join("");

        document.getElementById('word-example').textContent = word.example;

        // Setup word action buttons
        this.setupWordActionButtons(word, unitNumber, wordIndex);

        modal.classList.add('active');
    }

    setupWordActionButtons(word, unitNumber, wordIndex) {
        const wordKey = `${unitNumber}-${wordIndex}`;

        const difficultBtn = document.getElementById('mark-difficult');
        if (difficultBtn) {
            difficultBtn.onclick = () => {
                this.markWordDifficulty(wordKey, 'difficult');
                this.closeModal(); // Optional: close modal after marking
            };
        }

        const masteredBtn = document.getElementById('mark-mastered');
        if (masteredBtn) {
            masteredBtn.onclick = () => {
                this.markWordDifficulty(wordKey, 'mastered');
                this.closeModal();
            };
        }

        const favBtn = document.getElementById('add-to-favorites');
        if (favBtn) {
            favBtn.onclick = () => {
                this.toggleFavorite(wordKey);
            };
        }
    }

    markWordDifficulty(wordKey, status) {
        if (!this.userProgress.wordProgress) {
            this.userProgress.wordProgress = {};
        }
        this.userProgress.wordProgress[wordKey] = status;
        
        // Update Unit Mastery Count
        const [unitStr, ] = wordKey.split('-');
        const unitNum = parseInt(unitStr);
        if (!this.userProgress.unitProgress[unitNum]) {
            this.userProgress.unitProgress[unitNum] = { mastered: 0, completed: false };
        }
        
        // Recalculate mastery for this unit
        let masteredCount = 0;
        const unitWordsLen = this.vocabularyData[unitNum-1].length;
        
        // This is a simple check; for production, you'd iterate the keys
        // simpler approach for now: just increment if setting to mastered, but prevent double counting
        // Better approach: Iterate all words in unit to count mastered
        for(let i=0; i<unitWordsLen; i++) {
             if(this.userProgress.wordProgress[`${unitNum}-${i}`] === 'mastered') {
                 masteredCount++;
             }
        }
        
        this.userProgress.unitProgress[unitNum].mastered = masteredCount;
        if (masteredCount === unitWordsLen) {
            this.userProgress.unitProgress[unitNum].completed = true;
        }

        this.saveProgress();
        this.updateStats();
        this.renderUnits(); // Refresh progress bars
    }

    toggleFavorite(wordKey) {
        const index = this.userProgress.favorites.indexOf(wordKey);
        if (index > -1) {
            this.userProgress.favorites.splice(index, 1);
        } else {
            this.userProgress.favorites.push(wordKey);
        }
        this.saveProgress();
    }

    setupQuiz() {
        const quizContent = document.getElementById('quiz-content');
        quizContent.innerHTML = `
            <div class="quiz-welcome">
                <i class="fas fa-brain"></i>
                <h2>Ready to test your knowledge?</h2>
                <p>Choose your quiz settings and click Start Quiz to begin!</p>
            </div>
        `;
    }

    // Updated startQuiz to accept a specific unit override
    startQuiz(forcedUnit = null) {
        const unitSelect = document.getElementById('quiz-unit-select');
        const typeSelect = document.getElementById('quiz-type');

        if (!typeSelect) return;

        // Determine unit: Forced -> Dropdown -> Default 'random'
        let unit = 'random';
        if (forcedUnit) {
            unit = forcedUnit.toString();
            // Visually update dropdown if possible
            if(unitSelect) unitSelect.value = unit;
        } else if (unitSelect) {
            unit = unitSelect.value;
        }

        const type = typeSelect.value;

        this.quizState.unit = unit;
        this.quizState.type = type;
        this.quizState.currentQuestion = 0;
        this.quizState.score = 0;

        this.generateQuizQuestions();
        
        if (this.quizState.questions.length === 0) {
             alert("No words available for this selection. Try selecting 'All Words' or a specific unit.");
             return;
        }
        
        this.showQuizQuestion();
    }

    generateQuizQuestions() {
        let words = [];

        if (this.quizState.unit === 'random') {
            for (let unit of this.vocabularyData) {
                words = words.concat(unit);
            }
            words = this.shuffleArray(words).slice(0, 20);

        } else if (this.quizState.unit === 'difficult') {
            // Get words marked as difficult
            for (let unitNum = 0; unitNum < this.vocabularyData.length; unitNum++) {
                for (let wordNum = 0; wordNum < this.vocabularyData[unitNum].length; wordNum++) {
                    const wordKey = `${unitNum + 1}-${wordNum}`;
                    if (this.userProgress.wordProgress[wordKey] === 'difficult') {
                        words.push({
                            ...this.vocabularyData[unitNum][wordNum],
                            unit: unitNum + 1,
                            index: wordNum
                        });
                    }
                }
            }
             if (words.length === 0) {
                 // Fallback to random if no difficult words
                 for (let unit of this.vocabularyData) {
                    words = words.concat(unit);
                 }
             }
             words = this.shuffleArray(words).slice(0, 20);

        } else if (this.quizState.unit === 'all') {
              for (let unit of this.vocabularyData) {
                words = words.concat(unit);
              }
             words = this.shuffleArray(words).slice(0, 20);
        } else {
            // Specific Unit
            const unitNum = parseInt(this.quizState.unit);
            if (!isNaN(unitNum) && this.vocabularyData[unitNum - 1]) {
                // Get up to 20 words from the unit
                words = this.vocabularyData[unitNum - 1];
                words = this.shuffleArray(words).slice(0, 20);
            }
        }

        this.quizState.questions = words.map(word => this.createQuizQuestion(word));
    }

    createQuizQuestion(word) {
        const question = {
            word: word.word,
            correctAnswer: this.quizState.type === 'synonym' ? word.synonyms[0] : word.definition,
            type: this.quizState.type,
            wordObj: word
        };

        if (this.quizState.type === 'definition') {
            question.options = this.generateDefinitionOptions(word);
        } else if (this.quizState.type === 'synonym') {
            question.options = this.generateSynonymOptions(word);
        } else if (this.quizState.type === 'spelling') {
            question.options = this.generateSpellingOptions(word);
            question.correctAnswer = word.word;
        }

        return question;
    }

    generateDefinitionOptions(word) {
        const options = [word.definition];
        const otherWords = this.getRandomWords(3, word.word);
        otherWords.forEach(w => options.push(w.definition));
        return this.shuffleArray(options);
    }

    generateSynonymOptions(word) {
        const correctSynonym = word.synonyms[0] || "No synonym available";
        const options = [correctSynonym];
        
        const otherWords = this.getRandomWords(3, word.word);
        otherWords.forEach(w => {
            if(w.synonyms && w.synonyms.length > 0) {
                options.push(w.synonyms[0]);
            } else {
                options.push("Similar meaning"); // Fallback
            }
        });
        return this.shuffleArray(options);
    }

    generateSpellingOptions(word) {
        const options = [word.word];
        const variations = this.createSpellingVariations(word.word);
        return this.shuffleArray([...options, ...variations]);
    }

    createSpellingVariations(word) {
        const variations = [];
        // Simple logic to create fake spellings
        if (word.length > 3) {
            variations.push(word.replace(/[aeiou]/, 'e')); // swap vowel
            variations.push(word + 's'); // plural
            const reversed = word.split('').reverse().join('');
            variations.push(reversed.substring(0, Math.min(word.length, 5))); // junk word
        } else {
            variations.push(word + 'e');
            variations.push('un' + word);
            variations.push(word + 'ly');
        }
        return variations.slice(0, 3);
    }

    getRandomWords(count, excludeWord) {
        let allWords = [];
        // Gather a pool of words (flattening the first few units is usually enough for speed)
        // For better variety, pick random units
        this.vocabularyData.forEach(unit => allWords.push(...unit));

        const filtered = allWords.filter(w => w.word !== excludeWord);
        return this.shuffleArray(filtered).slice(0, count);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    showQuizQuestion() {
        const question = this.quizState.questions[this.quizState.currentQuestion];
        const quizContent = document.getElementById('quiz-content');

        if (!question) return;

        // Handle text escaping for onclick
        const escape = (str) => str.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        quizContent.innerHTML = `
            <div class="quiz-question">
                <div class="question-header">
                    <span class="question-number">Question ${this.quizState.currentQuestion + 1} of ${this.quizState.questions.length}</span>
                    <span class="quiz-score">Score: ${this.quizState.score}/${this.quizState.currentQuestion}</span>
                </div>
                <div class="question-text">
                    ${this.getQuestionText(question)}
                </div>
                <div class="quiz-options">
                    ${question.options.map((option, index) => `
                        <div class="quiz-option" onclick="app.selectQuizAnswer(this, '${escape(option)}')">
                            ${option}
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    getQuestionText(question) {
        if (this.quizState.type === 'definition') {
            return `What is the definition of "<strong>${question.word}</strong>"?`;
        } else if (this.quizState.type === 'synonym') {
            return `What is a synonym for "<strong>${question.word}</strong>"?`;
        } else if (this.quizState.type === 'spelling') {
            return `Choose the correct spelling for the word defined as:<br><em>"${question.wordObj.definition}"</em>`;
        }
        return `What do you know about "${question.word}"?`;
    }

    selectQuizAnswer(element, selectedAnswer) {
        // Prevent multiple clicks
        if(element.classList.contains('correct') || element.classList.contains('incorrect')) return;
        
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(opt => opt.onclick = null); // Disable all

        element.classList.add('selected');
        this.checkAnswer(element, selectedAnswer);
    }

    checkAnswer(element, selectedAnswer) {
        const question = this.quizState.questions[this.quizState.currentQuestion];
        let isCorrect = false;

        if (this.quizState.type === 'synonym') {
            // Synonyms logic: check if selected answer is ANY of the valid synonyms
            isCorrect = question.wordObj.synonyms.includes(selectedAnswer);
        } else {
            // Definition or Spelling: exact match
            isCorrect = (selectedAnswer === question.correctAnswer);
        }

        if (isCorrect) {
            this.quizState.score++;
            element.classList.add('correct');
        } else {
            element.classList.add('incorrect');
            // Highlight correct one
            document.querySelectorAll('.quiz-option').forEach(opt => {
                const txt = opt.innerText;
                if (this.quizState.type === 'synonym') {
                    if (question.wordObj.synonyms.includes(txt)) opt.classList.add('correct');
                } else {
                    if (txt === question.correctAnswer) opt.classList.add('correct');
                }
            });
        }

        setTimeout(() => {
            this.nextQuestion();
        }, 1500);
    }

    nextQuestion() {
        this.quizState.currentQuestion++;
        if (this.quizState.currentQuestion < this.quizState.questions.length) {
            this.showQuizQuestion();
        } else {
            this.showQuizResults();
        }
    }

    showQuizResults() {
        const percentage = Math.round((this.quizState.score / this.quizState.questions.length) * 100);
        const quizContent = document.getElementById('quiz-content');

        quizContent.innerHTML = `
            <div class="quiz-results">
                <div class="quiz-welcome">
                    <i class="fas fa-trophy" style="color: var(--warning);"></i>
                    <h2>Quiz Complete!</h2>
                    <div class="progress-circle" style="width: 120px; height: 120px; margin: 2rem auto;">
                         <div class="progress-text" style="position: relative; top: 0; left: 0; transform: none;">
                            <span style="font-size: 2.5rem;">${percentage}%</span>
                            <small>Score</small>
                         </div>
                    </div>
                    <p>You got ${this.quizState.score} out of ${this.quizState.questions.length} correct.</p>
                    <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center;">
                        <button class="primary-btn" onclick="app.startQuiz('${this.quizState.unit}')">
                            <i class="fas fa-redo"></i> Retry Quiz
                        </button>
                        <button class="secondary-btn" onclick="navigateToSection('units')">
                            Back to Units
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.updateQuizProgress(percentage);
    }

    updateQuizProgress(score) {
        this.userProgress.quizAttempts++;
        const totalPrev = this.userProgress.averageScore * (this.userProgress.quizAttempts - 1);
        this.userProgress.averageScore = (totalPrev + score) / this.userProgress.quizAttempts;

        const today = new Date().toDateString();
        if (this.userProgress.lastStudyDate !== today) {
            this.userProgress.streak++;
            this.userProgress.lastStudyDate = today;
        }
        
        this.saveProgress();
        this.updateStats();
    }

    renderProgress() {
        this.renderOverallProgress();
        this.renderActivityChart();
        this.renderDifficultWords();
    }

    renderOverallProgress() {
        const totalWords = this.vocabularyData.reduce((sum, unit) => sum + unit.length, 0);
        const masteredWords = Object.values(this.userProgress.wordProgress).filter(s => s === 'mastered').length;
        const percentage = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

        const pctEl = document.getElementById('progress-percentage');
        if(pctEl) pctEl.textContent = `${percentage}%`;
        
        const mastEl = document.getElementById('words-mastered');
        if(mastEl) mastEl.textContent = masteredWords;

        // Update circle stroke
        const circle = document.getElementById('progress-circle');
        if (circle) {
            const circumference = 2 * Math.PI * 45; // r=45
            const offset = circumference - (percentage / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }
    }

    renderActivityChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx || typeof Chart === 'undefined') return;

        // In a real app, dailyActivity would populate this
        const dataPoints = [0, 0, 0, 0, 0, 0, 0]; 
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('en', { weekday: 'short' }));
        }

        if (this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Words Mastered',
                    data: dataPoints,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    renderDifficultWords() {
        const list = document.getElementById('difficult-words-list');
        if (!list) return;
        list.innerHTML = '';

        let hasWords = false;
        for (const [key, status] of Object.entries(this.userProgress.wordProgress)) {
            if (status === 'difficult') {
                const [u, w] = key.split('-').map(Number);
                const wordObj = this.vocabularyData[u-1][w];
                if (wordObj) {
                    hasWords = true;
                    list.innerHTML += `<span class="difficult-word-tag">${wordObj.word}</span>`;
                }
            }
        }

        if (!hasWords) {
            list.innerHTML = '<p style="color:var(--text-secondary)">No words marked as difficult yet.</p>';
        }
    }

    performSearch(query) {
        if (!query.trim()) {
            this.renderUnits();
            return;
        }

        const container = document.getElementById('units-container');
        container.innerHTML = '';
        container.className = 'units-grid'; // Grid layout for search results

        let found = false;
        const q = query.toLowerCase();

        this.vocabularyData.forEach((unit, uIndex) => {
            unit.forEach((word, wIndex) => {
                if (word.word.toLowerCase().includes(q) || word.definition.toLowerCase().includes(q)) {
                    found = true;
                    // Reuse createWordElement but we need to wrap it visually since it's standalone
                    const wordEl = this.createWordElement(word, uIndex + 1, wIndex);
                    // Visual wrapper to match grid card height
                    const wrapper = document.createElement('div');
                    wrapper.className = 'unit-card'; // Reusing unit-card style for container
                    wrapper.style.padding = '0.5rem';
                    wrapper.style.minHeight = 'auto';
                    wrapper.appendChild(wordEl);
                    container.appendChild(wrapper);
                }
            });
        });

        if (!found) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No matching words found.</p>';
        }
    }

    setupDarkMode() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        this.updateDarkModeToggle(theme);
    }

    toggleDarkMode() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        this.updateDarkModeToggle(next);
    }

    updateDarkModeToggle(theme) {
        const icon = document.querySelector('#dark-mode-toggle i');
        if (icon) {
            icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    setupSearch() {
        // Already handled in listeners, but ensures debounce
    }

    loadProgress() {
        const saved = localStorage.getItem('userProgress');
        return saved ? JSON.parse(saved) : {
            wordProgress: {},
            unitProgress: {},
            quizAttempts: 0,
            totalScore: 0,
            averageScore: 0,
            streak: 0,
            lastStudyDate: null,
            dailyActivity: {},
            favorites: [],
            studyTime: 0,
            lastUnit: 1
        };
    }

    saveProgress() {
        localStorage.setItem('userProgress', JSON.stringify(this.userProgress));
    }

    updateStats() {
        // Logic to update dashboard stats
        const completed = Object.values(this.userProgress.unitProgress).filter(u => u.completed).length;
        const elComp = document.getElementById('completed-units');
        if(elComp) elComp.textContent = completed;
        
        const elStreak = document.getElementById('study-streak');
        if(elStreak) elStreak.textContent = this.userProgress.streak;
        
        const elQuiz = document.getElementById('quiz-score');
        if(elQuiz) elQuiz.textContent = Math.round(this.userProgress.averageScore || 0) + '%';
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }

    setUnitView(type) {
        localStorage.setItem('unitView', type);
        const gBtn = document.getElementById('grid-view-btn');
        const lBtn = document.getElementById('list-view-btn');
        if(gBtn) gBtn.classList.toggle('active', type === 'grid');
        if(lBtn) lBtn.classList.toggle('active', type === 'list');
        this.renderUnits();
    }

    // Actions
    continueStudying() {
        // Logic to find last accessed unit or default to 1
        // For now, open Unit 1
        this.loadSection('units');
        this.openUnitModal(1); 
    }
    
    takeQuickQuiz() {
        this.loadSection('quiz');
        this.startQuiz();
    }
    
    reviewDifficultWords() {
        this.loadSection('progress');
        // Scroll to bottom
        window.scrollTo(0, document.body.scrollHeight);
    }
    
    exportProgress() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.userProgress));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "makonian_progress.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

// Init
const app = new MakonianApp(vocabularyData, unitMetadata);

// Global hooks
window.navigateToSection = (s) => app.loadSection(s);
window.continueStudying = () => app.continueStudying();
window.takeQuickQuiz = () => app.takeQuickQuiz();
window.reviewDifficultWords = () => app.reviewDifficultWords();
window.exportProgress = () => app.exportProgress();

// Close modals on outside click
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) app.closeModal();
};
