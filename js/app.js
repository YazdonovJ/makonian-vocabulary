// Main application JavaScript

class MakonianApp {
    constructor(vocabularyData, unitMetadata) {
        this.currentSection = 'home';
        this.currentUnit = null;
        
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
        
        // Append specific units to the dropdown
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

    // --- Unit Modal Logic ---

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

        // --- Study Button Logic (Starts at first word) ---
        const studyBtn = document.getElementById('study-unit-btn');
        const newStudyBtn = studyBtn.cloneNode(true); // Remove old listeners
        studyBtn.parentNode.replaceChild(newStudyBtn, studyBtn);
        
        newStudyBtn.onclick = () => {
            this.closeModal();
            if(words.length > 0) {
                this.openWordModal(words[0], unitNumber, 0);
            }
        };

        // --- Quiz Button Logic (Starts quiz for this unit) ---
        const quizBtn = document.getElementById('quiz-unit-btn');
        const newQuizBtn = quizBtn.cloneNode(true); // Remove old listeners
        quizBtn.parentNode.replaceChild(newQuizBtn, quizBtn);

        newQuizBtn.onclick = () => {
            this.closeModal();
            this.loadSection('quiz');
            this.startQuiz(unitNumber); 
        };

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

    // --- Word Detail Modal Logic (With Navigation & Visual Feedback) ---
    
    openWordModal(word, unitNumber, wordIndex) {
        const modal = document.getElementById('word-modal');

        // 1. Populate Text Content
        document.getElementById('word-title').textContent = word.word;
        document.getElementById('word-definition').textContent = word.definition;
        document.getElementById('word-example').textContent = word.example;

        const synonymsList = document.getElementById('word-synonyms');
        synonymsList.innerHTML = word.synonyms.map(s =>
            `<span class="synonym-tag">${s}</span>`
        ).join("");

        // 2. Store current state for navigation
        this.currentViewedUnit = unitNumber;
        this.currentViewedIndex = wordIndex;

        const wordKey = `${unitNumber}-${wordIndex}`;

        // 3. Update Action Buttons (Visuals & Listeners)
        this.updateWordModalButtons(wordKey);
        this.setupWordActionButtons(wordKey);

        // 4. Setup Navigation Buttons (Next/Prev)
        this.setupWordNavigation(unitNumber, wordIndex);

        modal.classList.add('active');
    }

    updateWordModalButtons(wordKey) {
        const status = this.userProgress.wordProgress[wordKey];
        const isFav = this.userProgress.favorites.includes(wordKey);

        const diffBtn = document.getElementById('mark-difficult');
        const mastBtn = document.getElementById('mark-mastered');
        const favBtn = document.getElementById('add-to-favorites');

        // Reset classes and text
        diffBtn.className = 'difficulty-btn';
        mastBtn.className = 'mastery-btn';
        favBtn.className = 'favorite-btn';
        
        diffBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Mark Difficult';
        mastBtn.innerHTML = '<i class="fas fa-check"></i> Mark Mastered';
        favBtn.innerHTML = '<i class="far fa-heart"></i> Add to Favorites';

        // Apply Active States based on stored data
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

    setupWordActionButtons(wordKey) {
        const diffBtn = document.getElementById('mark-difficult');
        const mastBtn = document.getElementById('mark-mastered');
        const favBtn = document.getElementById('add-to-favorites');

        // Remove old listeners using cloneNode
        const newDiffBtn = diffBtn.cloneNode(true);
        diffBtn.parentNode.replaceChild(newDiffBtn, diffBtn);
        
        const newMastBtn = mastBtn.cloneNode(true);
        mastBtn.parentNode.replaceChild(newMastBtn, mastBtn);

        const newFavBtn = favBtn.cloneNode(true);
        favBtn.parentNode.replaceChild(newFavBtn, favBtn);

        // Add new click listeners that update state AND visuals immediately
        newDiffBtn.onclick = () => {
            this.markWordDifficulty(wordKey, 'difficult');
            this.updateWordModalButtons(wordKey);
        };

        newMastBtn.onclick = () => {
            this.markWordDifficulty(wordKey, 'mastered');
            this.updateWordModalButtons(wordKey);
        };

        newFavBtn.onclick = () => {
            this.toggleFavorite(wordKey);
            this.updateWordModalButtons(wordKey);
        };
    }

    setupWordNavigation(unitNumber, wordIndex) {
        const prevBtn = document.getElementById('prev-word-btn');
        const nextBtn = document.getElementById('next-word-btn');
        
        // Get the total number of words in this current unit
        const unitWords = this.vocabularyData[unitNumber - 1];
        const totalWords = unitWords.length;

        // Disable buttons if at boundaries
        prevBtn.disabled = (wordIndex === 0);
        nextBtn.disabled = (wordIndex === totalWords - 1);

        // Refresh listeners
        const newPrev = prevBtn.cloneNode(true);
        const newNext = nextBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrev, prevBtn);
        nextBtn.parentNode.replaceChild(newNext, nextBtn);

        newPrev.onclick = () => this.navigateWord(-1);
        newNext.onclick = () => this.navigateWord(1);
    }

    navigateWord(direction) {
        const unitWords = this.vocabularyData[this.currentViewedUnit - 1];
        const newIndex = this.currentViewedIndex + direction;

        // Safety check
        if (newIndex >= 0 && newIndex < unitWords.length) {
            const nextWord = unitWords[newIndex];
            this.openWordModal(nextWord, this.currentViewedUnit, newIndex);
        }
    }

    markWordDifficulty(wordKey, status) {
        if (!this.userProgress.wordProgress) {
            this.userProgress.wordProgress = {};
        }
        
        // Toggle logic: if clicking "difficult" and it's already "difficult", unmark it (set to 'new')
        // Only for favorites is it a pure toggle, but for status it's nice to have too.
        // Current logic: Set to clicked status.
        this.userProgress.wordProgress[wordKey] = status;
        
        // Update Unit Mastery Stats
        const [unitStr, ] = wordKey.split('-');
        const unitNum = parseInt(unitStr);
        
        if (!this.userProgress.unitProgress[unitNum]) {
            this.userProgress.unitProgress[unitNum] = { mastered: 0, completed: false };
        }
        
        // Recalculate mastery for this unit
        let masteredCount = 0;
        const unitWordsLen = this.vocabularyData[unitNum-1].length;
        
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
        
        // If the Unit Modal list is open, update the status badge there too
        const statusBadge = document.querySelector(`.word-status[data-word="${wordKey}"]`);
        if(statusBadge) {
            statusBadge.textContent = status;
            statusBadge.className = `word-status ${status}`;
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

    // --- Quiz Logic ---

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

    startQuiz(forcedUnit = null) {
        const unitSelect = document.getElementById('quiz-unit-select');
        const typeSelect = document.getElementById('quiz-type');

        if (!typeSelect) return;

        let unit = 'random';
        if (forcedUnit) {
            unit = forcedUnit.toString();
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
            const unitNum = parseInt(this.quizState.unit);
            if (!isNaN(unitNum) && this.vocabularyData[unitNum - 1]) {
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
                options.push("Similar meaning");
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
            variations.push(word.replace(/[aeiou]/, 'e'));
            variations.push(word + 's');
            const reversed = word.split('').reverse().join('');
            variations.push(reversed.substring(0, Math.min(word.length, 5)));
        } else {
            variations.push(word + 'e');
            variations.push('un' + word);
            variations.push(word + 'ly');
        }
        return variations.slice(0, 3);
    }

    getRandomWords(count, excludeWord) {
        let allWords = [];
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
        if(element.classList.contains('correct') || element.classList.contains('incorrect')) return;
        
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(opt => opt.onclick = null); 

        element.classList.add('selected');
        this.checkAnswer(element, selectedAnswer);
    }

    checkAnswer(element, selectedAnswer) {
        const question = this.quizState.questions[this.quizState.currentQuestion];
        let isCorrect = false;

        if (this.quizState.type === 'synonym') {
            isCorrect = question.wordObj.synonyms.includes(selectedAnswer);
        } else {
            isCorrect = (selectedAnswer === question.correctAnswer);
        }

        if (isCorrect) {
            this.quizState.score++;
            element.classList.add('correct');
        } else {
            element.classList.add('incorrect');
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

        const circle = document.getElementById('progress-circle');
        if (circle) {
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (percentage / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }
    }

    renderActivityChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx || typeof Chart === 'undefined') return;

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
                if (this.vocabularyData[u-1] && this.vocabularyData[u-1][w]) {
                    const wordObj = this.vocabularyData[u-1][w];
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
        container.className = 'units-grid';

        let found = false;
        const q = query.toLowerCase();

        this.vocabularyData.forEach((unit, uIndex) => {
            unit.forEach((word, wIndex) => {
                if (word.word.toLowerCase().includes(q) || word.definition.toLowerCase().includes(q)) {
                    found = true;
                    const wordEl = this.createWordElement(word, uIndex + 1, wIndex);
                    const wrapper = document.createElement('div');
                    wrapper.className = 'unit-card';
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
        // Initialized in constructor
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
