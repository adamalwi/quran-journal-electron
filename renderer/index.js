const fs = require('fs');
const path = require('path');

let allSurahs = [];
let userProgress = {};
const PROGRESS_FILE = path.join(__dirname, '../data/progress.json');

// Load progress data
function loadUserProgress() {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
            userProgress = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// Save progress data
function saveUserProgress() {
    try {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(userProgress, null, 2));
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Fetch all surahs from API
async function fetchAllSurahs() {
    try {
        showLoading(true);
        
        const response = await fetch('http://api.alquran.cloud/v1/surah');
        const data = await response.json();

        if (data.code === 200) {
            allSurahs = data.data;
            loadUserProgress();
            renderSurahList(allSurahs);
            renderSidebarSurahs(allSurahs);
        } else {
            throw new Error('Failed to load surahs');
        }
    } catch (error) {
        showError('Failed to load surahs. Please check your internet connection.');
    } finally {
        showLoading(false);
    }
}

// Render main surah list
function renderSurahList(surahs) {
    const container = document.getElementById('surahGrid');
    
    if (surahs.length === 0) {
        container.innerHTML = '<p class="no-results">No surahs found.</p>';
        return;
    }

    container.innerHTML = surahs.map(surah => createSurahCard(surah)).join('');
    container.style.display = 'grid';
}

// Render sidebar surah list
function renderSidebarSurahs(surahs) {
    const container = document.getElementById('sidebarSurahs');
    container.innerHTML = surahs.map(surah => createSidebarSurahItem(surah)).join('');
}

function createSidebarSurahItem(surah) {
    return `
        <div class="surah-item" onclick="openSurahModal(${surah.number})">
            <div class="surah-number">${surah.number}</div>
            <div class="surah-info">
                <div class="surah-name">${surah.englishName}</div>
                <div class="surah-meta">${surah.numberOfAyahs} verses • ${surah.revelationType}</div>
            </div>
        </div>
    `;
}

function createSurahCard(surah) {
    const progress = userProgress[surah.number] || { completed: 0, notes: '' };
    const percent = Math.round((progress.completed / surah.numberOfAyahs) * 100);
    const isComplete = progress.completed === surah.numberOfAyahs;

    return `
        <div class="surah-card ${isComplete ? 'completed' : ''}" onclick="openSurahModal(${surah.number})">
            <div class="card-header">
                <div>
                    <div class="surah-title">${surah.number}. ${surah.englishName}</div>
                    <div class="surah-arabic">${surah.name}</div>
                </div>
            </div>
            
            <div class="surah-translation">${surah.englishNameTranslation}</div>
            
            <div class="surah-details">
                <span class="detail-tag">${surah.numberOfAyahs} verses</span>
                <span class="detail-tag">${surah.revelationType}</span>
            </div>

            <div class="progress-section">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
                <div class="progress-text">${progress.completed}/${surah.numberOfAyahs} (${percent}%)</div>
            </div>

            <div class="card-actions">
                <button class="btn btn-primary" onclick="event.stopPropagation(); openSurahModal(${surah.number})">
                    ${progress.completed > 0 ? 'Update Progress' : 'Start Reading'}
                </button>
                ${progress.completed > 0 ? 
                    `<span class="status-badge ${isComplete ? 'badge-completed' : 'badge-progress'}">
                        ${isComplete ? 'Completed' : 'In Progress'}
                    </span>` : ''}
            </div>
        </div>
    `;
}

// Page navigation
function showPage(pageId) {
    // Update active nav tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show selected page
    document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    
    // Load progress page if needed
    if (pageId === 'progress') {
        loadProgressPage();
    }
}

function loadProgressPage() {
    const stats = calculateStats();
    const statsContainer = document.getElementById('statsGrid');
    const progressContainer = document.getElementById('progressList');
    
    // Render statistics
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${stats.completed}</div>
            <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.inProgress}</div>
            <div class="stat-label">In Progress</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.totalAyahs}</div>
            <div class="stat-label">Verses Read</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.overallPercent}%</div>
            <div class="stat-label">Overall Progress</div>
        </div>
    `;
    
    // Render progress list
    const surahsWithProgress = getSurahsWithProgress();
    if (surahsWithProgress.length === 0) {
        progressContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                <h3>No progress yet</h3>
                <p>Start reading surahs to track your progress!</p>
            </div>
        `;
    } else {
        progressContainer.innerHTML = surahsWithProgress.map(item => createProgressCard(item)).join('');
    }
}

function calculateStats() {
    const completedSurahs = Object.keys(userProgress).filter(num => {
        const progress = userProgress[num];
        const surah = allSurahs.find(s => s.number == num);
        return surah && progress.completed === surah.numberOfAyahs;
    }).length;

    const inProgressSurahs = Object.keys(userProgress).filter(num => {
        const progress = userProgress[num];
        return progress.completed > 0 && progress.completed < (allSurahs.find(s => s.number == num)?.numberOfAyahs || 0);
    }).length;

    const totalAyahs = Object.values(userProgress).reduce((sum, progress) => sum + progress.completed, 0);
    const totalPossible = allSurahs.reduce((sum, surah) => sum + surah.numberOfAyahs, 0);
    const overallPercent = totalPossible > 0 ? Math.round((totalAyahs / totalPossible) * 100) : 0;

    return { completed: completedSurahs, inProgress: inProgressSurahs, totalAyahs, overallPercent };
}

function getSurahsWithProgress() {
    return Object.keys(userProgress)
        .map(num => {
            const surah = allSurahs.find(s => s.number == num);
            const progress = userProgress[num];
            return { surah, progress };
        })
        .filter(item => item.surah && item.progress.completed > 0)
        .sort((a, b) => new Date(b.progress.updatedAt) - new Date(a.progress.updatedAt));
}

function createProgressCard(item) {
    const { surah, progress } = item;
    const percent = Math.round((progress.completed / surah.numberOfAyahs) * 100);
    const isComplete = progress.completed === surah.numberOfAyahs;

    return `
        <div class="surah-card ${isComplete ? 'completed' : ''}">
            <div class="card-header">
                <div>
                    <div class="surah-title">${surah.number}. ${surah.englishName}</div>
                    <div class="surah-arabic">${surah.name}</div>
                </div>
            </div>
            
            <div class="progress-section">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
                <div class="progress-text">${progress.completed}/${surah.numberOfAyahs} verses (${percent}%)</div>
            </div>
            
            ${progress.notes ? `
                <div style="background: #f8f9fa; padding: 0.75rem; border-radius: 6px; margin: 1rem 0; font-size: 0.9rem;">
                    <strong>Notes:</strong> ${progress.notes}
                </div>
            ` : ''}
            
            <div style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;">
                Last updated: ${new Date(progress.updatedAt).toLocaleDateString()}
            </div>
        </div>
    `;
}

// Modal functions (same as before)
function openSurahModal(surahNumber) {
    const surah = allSurahs.find(s => s.number === surahNumber);
    const progress = userProgress[surah.number] || { completed: 0, notes: '' };

    document.getElementById('modalTitle').textContent = `Surah ${surah.englishName}`;
    
    document.getElementById('modalBody').innerHTML = `
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <p><strong>Arabic:</strong> ${surah.name}</p>
            <p><strong>Translation:</strong> ${surah.englishNameTranslation}</p>
            <p><strong>Type:</strong> ${surah.revelationType}</p>
            <p><strong>Total Verses:</strong> ${surah.numberOfAyahs}</p>
        </div>

        <div class="form-group">
            <label class="form-label">Completed Verses:</label>
            <div class="slider-container">
                <input type="range" id="ayahSlider" min="0" max="${surah.numberOfAyahs}" 
                       value="${progress.completed}" class="slider"
                       oninput="updateSliderValue(this.value, ${surah.numberOfAyahs})">
                <span id="sliderValue">${progress.completed}/${surah.numberOfAyahs}</span>
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">Your Reflections:</label>
            <textarea id="surahNotes" class="textarea" placeholder="Write your thoughts and reflections...">${progress.notes}</textarea>
        </div>

        <div class="form-actions">
            <button class="btn btn-success" onclick="saveSurahProgress(${surah.number})">Save Progress</button>
            <button class="btn btn-warning" onclick="markSurahComplete(${surah.number})">Mark Complete</button>
            ${progress.completed > 0 ? 
                `<button class="btn btn-danger" onclick="resetSurahProgress(${surah.number})">Reset</button>` : ''}
        </div>
    `;

    showModal();
}

function updateSliderValue(value, total) {
    document.getElementById('sliderValue').textContent = `${value}/${total}`;
}

function saveSurahProgress(surahNumber) {
    const completed = parseInt(document.getElementById('ayahSlider').value);
    const notes = document.getElementById('surahNotes').value;

    userProgress[surahNumber] = {
        completed: completed,
        notes: notes,
        updatedAt: new Date().toISOString()
    };

    saveUserProgress();
    renderSurahList(allSurahs);
    renderSidebarSurahs(allSurahs);
    closeModal();
    showMessage('Progress saved successfully!');
}

function markSurahComplete(surahNumber) {
    const surah = allSurahs.find(s => s.number === surahNumber);
    document.getElementById('ayahSlider').value = surah.numberOfAyahs;
    updateSliderValue(surah.numberOfAyahs, surah.numberOfAyahs);
}

function resetSurahProgress(surahNumber) {
    if (confirm('Are you sure you want to reset your progress for this surah?')) {
        delete userProgress[surahNumber];
        saveUserProgress();
        renderSurahList(allSurahs);
        renderSidebarSurahs(allSurahs);
        closeModal();
        showMessage('Progress reset!');
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (!query) {
            renderSurahList(allSurahs);
            renderSidebarSurahs(allSurahs);
            return;
        }

        const filtered = allSurahs.filter(surah => 
            surah.englishName.toLowerCase().includes(query) ||
            surah.name.toLowerCase().includes(query) ||
            surah.englishNameTranslation.toLowerCase().includes(query)
        );

        renderSurahList(filtered);
        renderSidebarSurahs(filtered);
    });
}

// UI Helpers
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    document.getElementById('surahGrid').innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #dc3545;">
            <p>${message}</p>
        </div>
    `;
    document.getElementById('surahGrid').style.display = 'grid';
}

function showMessage(message) {
    const msg = document.createElement('div');
    msg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #0fa36b;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1001;
    `;
    msg.textContent = message;
    document.body.appendChild(msg);

    setTimeout(() => msg.remove(), 3000);
}

function showModal() {
    document.getElementById('surahModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('surahModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('surahModal');
    if (event.target === modal) closeModal();
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    fetchAllSurahs();
    setupSearch();
});