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

        // Use instance data instead of relying on globals directly
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
        // Fix array access (0-indexed)
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

        modal.classList.add('active');
    }

    createWordElement(word, unitNumber, wordIndex) {
        const wordEl = document.createElement('div');
        wordEl.className = 'word-item';
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
            };
        }

        const masteredBtn = document.getElementById('mark-mastered');
        if (masteredBtn) {
            masteredBtn.onclick = () => {
                this.markWordDifficulty(wordKey, 'mastered');
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
        this.saveProgress();
        this.updateStats();

        // Update UI
        const statusElement = document.querySelector(`.word-status[data-word="${wordKey}"]`);
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `word-status ${status}`;
        }
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

    startQuiz() {
        const unitSelect = document.getElementById('quiz-unit-select');
        const typeSelect = document.getElementById('quiz-type');

        if (!unitSelect || !typeSelect) return;

        const unit = unitSelect.value;
        const type = typeSelect.value;

        this.quizState.unit = unit;
        this.quizState.type = type;
        this.quizState.currentQuestion = 0;
        this.quizState.score = 0;

        this.generateQuizQuestions();
        
        if (this.quizState.questions.length === 0) {
             alert("No words available for the selected quiz settings. Try a different unit or 'All Words'.");
             return;
        }
        
        this.showQuizQuestion();
    }

    generateQuizQuestions() {
        let words = [];

        if (this.quizState.unit === 'random') {
            // Get random words from all units
            for (let unit of this.vocabularyData) {
                words = words.concat(unit);
            }
            words = this.shuffleArray(words).slice(0, 20);

        } else if (this.quizState.unit === 'difficult') {
            // Get words marked as difficult
            const difficultWords = [];
            for (let unitNum = 0; unitNum < this.vocabularyData.length; unitNum++) {
                for (let wordNum = 0; wordNum < this.vocabularyData[unitNum].length; wordNum++) {
                    const wordKey = `${unitNum + 1}-${wordNum}`;
                    if (this.userProgress.wordProgress[wordKey] === 'difficult') {
                        difficultWords.push({
                            ...this.vocabularyData[unitNum][wordNum],
                            unit: unitNum + 1,
                            index: wordNum
                        });
                    }
                }
            }
             // Fallback if not enough difficult words
             if (difficultWords.length === 0) {
                 // Just grab random words instead
                 for (let unit of this.vocabularyData) {
                    words = words.concat(unit);
                 }
                 words = this.shuffleArray(words).slice(0, 20);
             } else {
                 words = difficultWords.slice(0, 20);
             }

        } else if (this.quizState.unit === 'all') {
              for (let unit of this.vocabularyData) {
                words = words.concat(unit);
              }
             words = this.shuffleArray(words).slice(0, 20);
        } else {
            // Get words from specific unit (unit number string)
            // Need to parse "Unit 1", "1", etc. but the select values are likely just numbers or strings
            // Assuming value is numeric string based on typical select options not shown in full code
            // If unit is just a number:
            const unitNum = parseInt(this.quizState.unit);
            if (!isNaN(unitNum) && this.vocabularyData[unitNum - 1]) {
                words = this.vocabularyData[unitNum - 1].slice(0, 20); // Take up to 20 words
                words = this.shuffleArray(words);
            }
        }

        this.quizState.questions = words.map(word => this.createQuizQuestion(word));
    }

    createQuizQuestion(word) {
        const question = {
            word: word.word,
            correctAnswer: word.definition,
            type: this.quizState.type
        };

        // Generate options based on quiz type
        if (this.quizState.type === 'definition') {
            question.options = this.generateDefinitionOptions(word);
            question.correctAnswer = word.definition;
        } else if (this.quizState.type === 'synonym') {
            question.options = this.generateSynonymOptions(word);
            // The correct answer is the first synonym in our list for now, logic handled in checking
             question.correctAnswer = word.synonyms[0];
        } else if (this.quizState.type === 'spelling') {
            question.options = this.generateSpellingOptions(word);
             question.correctAnswer = word.word;
        }

        // Store full word object for context if needed
        question.wordObj = word;

        return question;
    }

    generateDefinitionOptions(word) {
        const options = [word.definition];
        const otherWords = this.getRandomWords(3, word.word);
        otherWords.forEach(w => options.push(w.definition));
        return this.shuffleArray(options);
    }

    generateSynonymOptions(word) {
        // Take the first synonym as the correct option for simplicity in generation
        const correctSynonym = word.synonyms[0];
        const options = [correctSynonym];
        
        const otherWords = this.getRandomWords(3, word.word);
        otherWords.forEach(w => {
            if(w.synonyms && w.synonyms.length > 0) {
                options.push(w.synonyms[0]);
            } else {
                options.push("No synonym"); // Fallback
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
        if (word.length > 3) {
             // Simple variations: remove double letters, swap vowels, etc.
            variations.push(word.replace(/[aeiou]/, 'e')); // replace first vowel
            variations.push(word.split('').reverse().join('')); // reverse (silly but works for distinct wrong answer)
            variations.push(word + 's'); // pluralize incorrectly or redundantly
        } else {
             variations.push(word + 'e');
             variations.push(word + 's');
             variations.push('un' + word);
        }
        return variations.slice(0, 3);
    }

    getRandomWords(count, excludeWord) {
        let allWords = [];
        this.vocabularyData.forEach(unit => {
            allWords.push(...unit);
        });

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
                        <div class="quiz-option" onclick="app.selectQuizAnswer(this, '${option.replace(/'/g, "\\'")}')">
                            ${option}
                        </div>
                    `).join("")}
                </div>
            </div>
            <div class="quiz-actions">
                 <!-- Next button logic is handled via selection usually, but added here -->
                 <button class="primary-btn" id="next-question-btn" style="display:none;" onclick="app.nextQuestion()">Next</button>
            </div>
        `;
    }

    getQuestionText(question) {
        switch (this.quizState.type) {
            case 'definition':
                return `What is the definition of "<strong>${question.word}</strong>"?`;
            case 'synonym':
                return `What is a synonym for "<strong>${question.word}</strong>"?`;
            case 'spelling':
                return `Which is the correct spelling for the word meaning "${question.correctAnswer !== question.word ? question.wordObj.definition : '...'}"?`; 
                // Note: For spelling, question.word is the correct spelling, but we want to prompt with definition.
                // However, my createQuestion logic sets word: word.word.
                // Let's adjust for spelling type:
                 if(this.quizState.type === 'spelling') return `Choose the correct spelling for the word defined as: "${question.wordObj.definition}"`;
                 return `What is the definition of "${question.word}"?`;
            default:
                return `What do you know about "${question.word}"?`;
        }
    }

    selectQuizAnswer(element, selectedAnswer) {
        // Prevent multiple selections
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(opt => opt.classList.remove('selected'));
        element.classList.add('selected');
        
        // Trigger check immediately or wait for button? 
        // Let's trigger check immediately for better UX on mobile
        this.checkAnswer(element, selectedAnswer);
    }

    checkAnswer(element, selectedAnswer) {
        const question = this.quizState.questions[this.quizState.currentQuestion];
        let isCorrect = false;

        if (this.quizState.type === 'definition') {
            isCorrect = (selectedAnswer === question.correctAnswer);
        } else if (this.quizState.type === 'synonym') {
             // Check if selected answer is in the synonym list of the word
            isCorrect = question.wordObj.synonyms.includes(selectedAnswer);
        } else if (this.quizState.type === 'spelling') {
            isCorrect = (selectedAnswer === question.correctAnswer);
        }

        // Disable further clicks
        const allOptions = document.querySelectorAll('.quiz-option');
        allOptions.forEach(opt => opt.onclick = null);

        if (isCorrect) {
            this.quizState.score++;
            element.classList.add('correct');
        } else {
            element.classList.add('incorrect');
            // Highlight correct answer
            allOptions.forEach(option => {
                 // Simple text match check for highlighting
                 const optText = option.innerText.trim();
                 let optIsCorrect = false;
                 if (this.quizState.type === 'definition' && optText === question.correctAnswer) optIsCorrect = true;
                 if (this.quizState.type === 'synonym' && question.wordObj.synonyms.includes(optText)) optIsCorrect = true;
                 if (this.quizState.type === 'spelling' && optText === question.correctAnswer) optIsCorrect = true;
                 
                 if(optIsCorrect) option.classList.add('correct');
            });
        }

        // Move to next
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
                <div class="results-header">
                    <i class="fas fa-trophy"></i>
                    <h2>Quiz Complete!</h2>
                </div>
                <div class="results-stats">
                    <div class="score-circle">
                        <span class="score-percentage">${percentage}%</span>
                        <small>Score</small>
                    </div>
                    <div class="results-details">
                        <p><strong>Questions:</strong> ${this.quizState.questions.length}</p>
                        <p><strong>Correct:</strong> ${this.quizState.score}</p>
                        <p><strong>Incorrect:</strong> ${this.quizState.questions.length - this.quizState.score}</p>
                    </div>
                </div>
                <div class="results-actions">
                    <button class="primary-btn" onclick="app.startQuiz()">
                        <i class="fas fa-redo"></i> Take Another Quiz
                    </button>
                </div>
            </div>
        `;

        this.updateQuizProgress(percentage);
    }

    updateQuizProgress(score) {
        this.userProgress.quizAttempts++;
        // Basic average calculation
        const totalPreviousScore = this.userProgress.averageScore * (this.userProgress.quizAttempts - 1);
        this.userProgress.averageScore = (totalPreviousScore + score) / this.userProgress.quizAttempts;

        // Update streak
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
        const masteredWords = Object.values(this.userProgress.wordProgress).filter(status => status === 'mastered').length;

        const percentage = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

        document.getElementById('progress-percentage').textContent = `${percentage}%`;
        const masteredEl = document.getElementById('words-mastered');
        if(masteredEl) masteredEl.textContent = masteredWords;

        // Update progress circle
        const circle = document.getElementById('progress-circle');
        if (circle) {
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (percentage / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }
    }

    renderActivityChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx) return;

        // Mock data for demonstration if no real history is stored
        // In a real app, you'd store daily word counts.
        // Assuming dailyActivity is { "DateString": count }
        const activityData = this.userProgress.dailyActivity || {}; 
        
        const labels = [];
        const data = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            labels.push(date.toLocaleDateString('en', { weekday: 'short' }));
            data.push(activityData[dateStr] || 0); // Default 0
        }
        
        // If Chart.js is loaded
        if (typeof Chart !== 'undefined') {
             // Destroy old chart instance if exists to avoid overlap
             if(this.activityChartInstance) {
                 this.activityChartInstance.destroy();
             }

             this.activityChartInstance = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Words Studied',
                        data: data,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });
        }
    }

    renderDifficultWords() {
        const difficultWordsList = document.getElementById('difficult-words-list');
        if (!difficultWordsList) return;

        const difficultWords = [];

        // Get all words marked as difficult
        for (let unitNum = 0; unitNum < this.vocabularyData.length; unitNum++) {
            for (let wordNum = 0; wordNum < this.vocabularyData[unitNum].length; wordNum++) {
                const wordKey = `${unitNum + 1}-${wordNum}`;
                if (this.userProgress.wordProgress[wordKey] === 'difficult') {
                    difficultWords.push(this.vocabularyData[unitNum][wordNum].word);
                }
            }
        }

        if (difficultWords.length === 0) {
            difficultWordsList.innerHTML = '<p class="no-difficult-words">No words marked as difficult yet!</p>';
            return;
        }

        difficultWordsList.innerHTML = difficultWords.map(word =>
            `<span class="difficult-word-tag">${word}</span>`
        ).join("");
    }

    performSearch(query) {
        if (!query || !query.trim()) {
            this.renderUnits();
            return;
        }

        const results = [];
        this.vocabularyData.forEach((unit, unitIndex) => {
            unit.forEach((word, wordIndex) => {
                if (word.word.toLowerCase().includes(query.toLowerCase()) ||
                    word.definition.toLowerCase().includes(query.toLowerCase()) ||
                    word.synonyms.some(s => s.toLowerCase().includes(query.toLowerCase()))) {
                    
                    results.push({
                        word: word,
                        unit: unitIndex + 1,
                        wordIndex: wordIndex
                    });
                }
            });
        });

        this.displaySearchResults(results);
    }

    displaySearchResults(results) {
        const container = document.getElementById('units-container');
        container.innerHTML = "";
        container.className = 'units-grid'; // Force grid for search results

        if (results.length === 0) {
            container.innerHTML = '<p class="no-results">No words found matching your search.</p>';
            return;
        }

        results.forEach(result => {
            const wordEl = this.createWordElement(result.word, result.unit, result.wordIndex);
            // Wrap in a card for better look in grid
            const wrapper = document.createElement('div');
            wrapper.className = 'unit-card';
            wrapper.style.cursor = 'default';
            wrapper.appendChild(wordEl);
            container.appendChild(wrapper);
        });
    }

    setupDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateDarkModeToggle(savedTheme);
    }

    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateDarkModeToggle(newTheme);
    }

    updateDarkModeToggle(theme) {
        const toggle = document.getElementById('dark-mode-toggle');
        if(!toggle) return;
        const icon = toggle.querySelector('i');
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    setupSearch() {
        const searchInput = document.getElementById('search-input');
        if(!searchInput) return;
        
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
    }

    // Utility methods
    loadProgress() {
        const defaultProgress = {
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
        const saved = localStorage.getItem('userProgress');
        return saved ? JSON.parse(saved) : defaultProgress;
    }

    saveProgress() {
        localStorage.setItem('userProgress', JSON.stringify(this.userProgress));
    }

    updateStats() {
        const completedUnits = Object.values(this.userProgress.unitProgress).filter(p => p.completed).length;
        const studyTime = this.formatStudyTime(this.userProgress.studyTime);

        const elCompleted = document.getElementById('completed-units');
        if(elCompleted) elCompleted.textContent = completedUnits;

        const elTime = document.getElementById('study-time');
        if(elTime) elTime.textContent = studyTime;

        const elStreak = document.getElementById('study-streak');
        if(elStreak) elStreak.textContent = this.userProgress.streak;

        const elQuiz = document.getElementById('quiz-score');
        if(elQuiz) elQuiz.textContent = `${Math.round(this.userProgress.averageScore || 0)}%`;
    }

    formatStudyTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    // Quick action methods
    continueStudying() {
        const lastUnit = this.userProgress.lastUnit || 1;
        this.loadSection('units');
        this.openUnitModal(lastUnit);
    }

    takeQuickQuiz() {
        this.loadSection('quiz');
        this.startQuiz();
    }

    reviewDifficultWords() {
        this.loadSection('progress');
        const diffSection = document.querySelector('.difficult-words');
        if(diffSection) diffSection.scrollIntoView({ behavior: 'smooth' });
    }

    exportProgress() {
        const totalWords = this.vocabularyData.reduce((sum, unit) => sum + unit.length, 0);
        const masteredWords = Object.values(this.userProgress.wordProgress).filter(s => s === 'mastered').length;

        const data = {
            progress: this.userProgress,
            exportDate: new Date().toISOString(),
            totalWords: totalWords,
            masteredWords: masteredWords
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `makonian-progress-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    setUnitView(viewType) {
        localStorage.setItem('unitView', viewType);
        
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        
        if(gridBtn) gridBtn.classList.toggle('active', viewType === 'grid');
        if(listBtn) listBtn.classList.toggle('active', viewType === 'list');

        this.renderUnits();
    }
}

// Global functions for HTML onclick handlers
const app = new MakonianApp(vocabularyData, unitMetadata);

function navigateToSection(section) {
    app.loadSection(section);
}

function continueStudying() {
    app.continueStudying();
}

function takeQuickQuiz() {
    app.takeQuickQuiz();
}

function reviewDifficultWords() {
    app.reviewDifficultWords();
}

function exportProgress() {
    app.exportProgress();
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        app.closeModal();
    }
};
