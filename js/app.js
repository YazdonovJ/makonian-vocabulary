// Main application JavaScript
class MakonianApp {
    constructor() {
        this.currentSection = 'home';
        this.currentUnit = null;
        this.quizState = {
            questions: [],
            currentQuestion: 0,
            score: 0,
            type: 'definition',
            unit: 'random'
        };
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
            document.getElementById('loading-screen').style.display = 'none';
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
        document.getElementById('dark-mode-toggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        // Unit view toggle
        document.getElementById('grid-view-btn').addEventListener('click', () => {
            this.setUnitView('grid');
        });

        document.getElementById('list-view-btn').addEventListener('click', () => {
            this.setUnitView('list');
        });

        // Quiz controls
        document.getElementById('start-quiz-btn').addEventListener('click', () => {
            this.startQuiz();
        });

        // Modal controls
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Search functionality
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });
    }

    loadSection(section) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        // Show target section
        document.getElementById(section).classList.add('active');
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        this.currentSection = section;

        // Load section-specific content
        switch(section) {
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
        const viewType = localStorage.getItem('unitView') || 'grid';
        
        container.className = viewType === 'grid' ? 'units-grid' : 'units-list';
        container.innerHTML = '';

        const units = JSON.parse(localStorage.getItem('unitMetadata')) || unitMetadata;

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
        const totalWords = vocabularyData[unitNumber - 1].length;
        const masteredWords = progress.mastered || 0;
        return Math.round((masteredWords / totalWords) * 100);
    }

    getUnitWordsPreview(unitNumber) {
        const words = vocabularyData[unitNumber - 1];
        return words.slice(0, 5).map(word => 
            `<span class="word-tag">${word.word}</span>`
        ).join('');
    }

    openUnitModal(unitNumber) {
        this.currentUnit = unitNumber;
        const modal = document.getElementById('unit-modal');
        const words = vocabularyData[unitNumber - 1];
        const unitInfo = unitMetadata[unitNumber - 1];

        document.getElementById('modal-unit-title').textContent = `Unit ${unitNumber}: ${unitInfo.title}`;
        
        const wordsList = document.getElementById('modal-words-list');
        wordsList.innerHTML = '';

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

        const progress = this.userProgress.wordProgress[`${unitNumber}-${wordIndex}`] || 'new';

        wordEl.innerHTML = `
            <div class="word-header">
                <span class="word-text">${word.word}</span>
                <span class="word-status ${progress}">${progress}</span>
            </div>
            <p class="word-definition-short">${word.definition.substring(0, 80)}...</p>
            <div class="word-synonyms">
                ${word.synonyms.slice(0, 3).map(s => `<span class="synonym-tag">${s}</span>`).join('')}
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
        ).join('');
        
        document.getElementById('word-example').textContent = word.example;

        // Setup word action buttons
        this.setupWordActionButtons(word, unitNumber, wordIndex);

        modal.classList.add('active');
    }

    setupWordActionButtons(word, unitNumber, wordIndex) {
        const wordKey = `${unitNumber}-${wordIndex}`;
        
        document.getElementById('mark-difficult').onclick = () => {
            this.markWordDifficulty(wordKey, 'difficult');
        };
        
        document.getElementById('mark-mastered').onclick = () => {
            this.markWordDifficulty(wordKey, 'mastered');
        };
        
        document.getElementById('add-to-favorites').onclick = () => {
            this.toggleFavorite(wordKey);
        };
    }

    markWordDifficulty(wordKey, status) {
        if (!this.userProgress.wordProgress[wordKey]) {
            this.userProgress.wordProgress[wordKey] = 'new';
        }
        
        this.userProgress.wordProgress[wordKey] = status;
        this.saveProgress();
        this.updateStats();
        
        // Update UI
        const statusElement = document.querySelector(`[data-word="${wordKey}"] .word-status`);
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
        const unit = document.getElementById('quiz-unit-select').value;
        const type = document.getElementById('quiz-type').value;
        
        this.quizState.unit = unit;
        this.quizState.type = type;
        this.quizState.currentQuestion = 0;
        this.quizState.score = 0;
        
        this.generateQuizQuestions();
        this.showQuizQuestion();
    }

    generateQuizQuestions() {
        let words = [];
        
        if (this.quizState.unit === 'random') {
            // Get random words from all units
            for (let unit of vocabularyData) {
                words = words.concat(unit);
            }
            words = this.shuffleArray(words).slice(0, 20);
        } else if (this.quizState.unit === 'difficult') {
            // Get words marked as difficult
            const difficultWords = [];
            for (let unitNum = 0; unitNum < vocabularyData.length; unitNum++) {
                for (let wordNum = 0; wordNum < vocabularyData[unitNum].length; wordNum++) {
                    const wordKey = `${unitNum + 1}-${wordNum}`;
                    if (this.userProgress.wordProgress[wordKey] === 'difficult') {
                        difficultWords.push({...vocabularyData[unitNum][wordNum], unit: unitNum + 1, index: wordNum});
                    }
                }
            }
            words = difficultWords.slice(0, 20);
        } else {
            // Get words from specific unit
            const unitNum = parseInt(this.quizState.unit) - 1;
            words = vocabularyData[unitNum].slice(0, 20);
        }
        
        this.quizState.questions = words.map(word => this.createQuizQuestion(word));
    }

    createQuizQuestion(word) {
        const question = {
            word: word.word,
            correctAnswer: word.definition,
            type: this.quizState.type
        };
        
        // Generate wrong answers based on quiz type
        if (this.quizState.type === 'definition') {
            question.options = this.generateDefinitionOptions(word);
        } else if (this.quizState.type === 'synonym') {
            question.options = this.generateSynonymOptions(word);
        } else if (this.quizState.type === 'spelling') {
            question.options = this.generateSpellingOptions(word);
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
        const options = [...word.synonyms.slice(0, 1)];
        const otherWords = this.getRandomWords(3, word.word);
        otherWords.forEach(w => options.push(w.synonyms[0]));
        return this.shuffleArray(options);
    }

    generateSpellingOptions(word) {
        // Create spelling variations
        const options = [word.word];
        const variations = this.createSpellingVariations(word.word);
        return this.shuffleArray([...options, ...variations]);
    }

    createSpellingVariations(word) {
        // Simple spelling variation logic
        const variations = [];
        if (word.length > 5) {
            variations.push(word.replace(/[aeiou]/g, 'x'));
            variations.push(word.split('').reverse().join(''));
            variations.push(word + 'e');
        }
        return variations.slice(0, 3);
    }

    getRandomWords(count, excludeWord) {
        const allWords = [];
        vocabularyData.forEach(unit => {
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
                        <div class="quiz-option" onclick="app.selectQuizAnswer(${index})">
                            ${option}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="quiz-actions">
                <button class="secondary-btn" onclick="app.previousQuestion()">
                    <i class="fas fa-arrow-left"></i> Previous
                </button>
                <button class="primary-btn" onclick="app.nextQuestion()">
                    Next <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
    }

    getQuestionText(question) {
        switch(this.quizState.type) {
            case 'definition':
                return `What is the definition of "${question.word}"?`;
            case 'synonym':
                return `What is a synonym for "${question.word}"?`;
            case 'spelling':
                return `How do you spell the word that means "${question.correctAnswer}"?`;
            default:
                return `What do you know about "${question.word}"?`;
        }
    }

    selectQuizAnswer(selectedIndex) {
        const options = document.querySelectorAll('.quiz-option');
        options.forEach((option, index) => {
            option.classList.remove('selected');
            if (index === selectedIndex) {
                option.classList.add('selected');
            }
        });
    }

    nextQuestion() {
        const selectedOption = document.querySelector('.quiz-option.selected');
        if (!selectedOption) {
            alert('Please select an answer!');
            return;
        }

        const question = this.quizState.questions[this.quizState.currentQuestion];
        const selectedAnswer = selectedOption.textContent.trim();
        
        // Check if answer is correct
        const isCorrect = this.checkAnswer(selectedAnswer, question);
        
        if (isCorrect) {
            this.quizState.score++;
            selectedOption.classList.add('correct');
        } else {
            selectedOption.classList.add('incorrect');
            // Show correct answer
            document.querySelectorAll('.quiz-option').forEach(option => {
                if (this.checkAnswer(option.textContent.trim(), question)) {
                    option.classList.add('correct');
                }
            });
        }

        // Move to next question or show results
        setTimeout(() => {
            this.quizState.currentQuestion++;
            if (this.quizState.currentQuestion < this.quizState.questions.length) {
                this.showQuizQuestion();
            } else {
                this.showQuizResults();
            }
        }, 1500);
    }

    checkAnswer(answer, question) {
        if (this.quizState.type === 'definition') {
            return answer === question.correctAnswer;
        } else if (this.quizState.type === 'synonym') {
            return question.word.synonyms.includes(answer);
        } else if (this.quizState.type === 'spelling') {
            return answer === question.word;
        }
        return false;
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
                    <button class="secondary-btn" onclick="app.reviewIncorrectAnswers()">
                        <i class="fas fa-review"></i> Review Incorrect Answers
                    </button>
                </div>
            </div>
        `;

        // Update user progress
        this.updateQuizProgress(percentage);
    }

    updateQuizProgress(score) {
        this.userProgress.quizAttempts++;
        this.userProgress.totalScore += score;
        this.userProgress.averageScore = this.userProgress.totalScore / this.userProgress.quizAttempts;
        
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
        const totalWords = vocabularyData.reduce((sum, unit) => sum + unit.length, 0);
        const masteredWords = Object.values(this.userProgress.wordProgress).filter(status => status === 'mastered').length;
        const percentage = Math.round((masteredWords / totalWords) * 100);
        
        document.getElementById('progress-percentage').textContent = `${percentage}%`;
        document.getElementById('words-mastered').textContent = masteredWords;
        
        // Update progress circle
        const circle = document.getElementById('progress-circle');
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }

    renderActivityChart() {
        const ctx = document.getElementById('activity-chart').getContext('2d');
        const activityData = this.userProgress.dailyActivity;
        
        // Get last 7 days of data
        const labels = [];
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            labels.push(date.toLocaleDateString('en', { weekday: 'short' }));
            data.push(activityData[dateStr] || 0);
        }

        new Chart(ctx, {
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
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    renderDifficultWords() {
        const difficultWordsList = document.getElementById('difficult-words-list');
        const difficultWords = [];
        
        // Get all words marked as difficult
        for (let unitNum = 0; unitNum < vocabularyData.length; unitNum++) {
            for (let wordNum = 0; wordNum < vocabularyData[unitNum].length; wordNum++) {
                const wordKey = `${unitNum + 1}-${wordNum}`;
                if (this.userProgress.wordProgress[wordKey] === 'difficult') {
                    difficultWords.push(vocabularyData[unitNum][wordNum].word);
                }
            }
        }

        if (difficultWords.length === 0) {
            difficultWordsList.innerHTML = '<p class="no-difficult-words">No words marked as difficult yet!</p>';
            return;
        }

        difficultWordsList.innerHTML = difficultWords.map(word => 
            `<span class="difficult-word-tag">${word}</span>`
        ).join('');
    }

    performSearch(query) {
        if (!query.trim()) {
            this.renderUnits();
            return;
        }

        const results = [];
        vocabularyData.forEach((unit, unitIndex) => {
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
        container.innerHTML = '';

        if (results.length === 0) {
            container.innerHTML = '<p class="no-results">No words found matching your search.</p>';
            return;
        }

        results.forEach(result => {
            const wordEl = this.createWordElement(result.word, result.unit, result.wordIndex);
            container.appendChild(wordEl);
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
        const icon = toggle.querySelector('i');
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    setupSearch() {
        const searchInput = document.getElementById('search-input');
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
            studyTime: 0
        };

        const saved = localStorage.getItem('userProgress');
        return saved ? JSON.parse(saved) : defaultProgress;
    }

    saveProgress() {
        localStorage.setItem('userProgress', JSON.stringify(this.userProgress));
    }

    updateStats() {
        // Update home page stats
        const completedUnits = Object.values(this.userProgress.unitProgress).filter(p => p.completed).length;
        const studyTime = this.formatStudyTime(this.userProgress.studyTime);
        
        document.getElementById('completed-units').textContent = completedUnits;
        document.getElementById('study-time').textContent = studyTime;
        document.getElementById('study-streak').textContent = this.userProgress.streak;
        document.getElementById('quiz-score').textContent = `${Math.round(this.userProgress.averageScore)}%`;
    }

    formatStudyTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    // Quick action methods
    continueStudying() {
        // Find the last unit studied or start with unit 1
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
        document.querySelector('.difficult-words').scrollIntoView({ behavior: 'smooth' });
    }

    exportProgress() {
        const data = {
            progress: this.userProgress,
            exportDate: new Date().toISOString(),
            totalWords: vocabularyData.reduce((sum, unit) => sum + unit.length, 0),
            masteredWords: Object.values(this.userProgress.wordProgress).filter(s => s === 'mastered').length
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `makonian-progress-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Modal controls
    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // View controls
    setUnitView(viewType) {
        localStorage.setItem('unitView', viewType);
        document.getElementById('grid-view-btn').classList.toggle('active', viewType === 'grid');
        document.getElementById('list-view-btn').classList.toggle('active', viewType === 'list');
        this.renderUnits();
    }
}

// Initialize the app
const app = new MakonianApp();

// Global functions for HTML onclick handlers
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
}