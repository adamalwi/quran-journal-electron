const fs = require('fs');
const path = require('path');

let allSurahs = [];
let userProgress = {};
const PROGRESS_FILE = path.join(__dirname, '../data/progress.json');

// Load data on page start
async function initializeProgressPage() {
    try {
        const response = await fetch('http://api.alquran.cloud/v1/surah');
        const data = await response.json();
        
        if (data.code === 200) {
            allSurahs = data.data;
            loadProgressData();
            displayProgressPage();
        }
    } catch (error) {
        document.getElementById('progressList').innerHTML = `
            <div class="error-message">
                <p>Failed to load data. Check your connection.</p>
            </div>
        `;
    }
}

function loadProgressData() {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
            userProgress = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

function displayProgressPage() {
    showStatistics();
    showProgressList();
}

function showStatistics() {
    const stats = calculateStats();
    const statsContainer = document.getElementById('stats');

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
            <div class="stat-label">Ayahs Read</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.overallPercent}%</div>
            <div class="stat-label">Overall</div>
        </div>
    `;
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

function showProgressList() {
    const container = document.getElementById('progressList');
    const surahsWithProgress = getSurahsWithProgress();

    if (surahsWithProgress.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No progress yet</h3>
                <p>Start reading surahs to track your progress!</p>
                <button class="btn btn-primary" onclick="goToSurahList()">Start Reading</button>
            </div>
        `;
        return;
    }

    container.innerHTML = surahsWithProgress.map(item => createProgressItem(item)).join('');
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

function createProgressItem(item) {
    const { surah, progress } = item;
    const percent = Math.round((progress.completed / surah.numberOfAyahs) * 100);
    const isComplete = progress.completed === surah.numberOfAyahs;

    return `
        <div class="progress-item ${isComplete ? 'completed' : ''}">
            <div class="progress-header">
                <h4>${surah.number}. ${surah.englishName}</h4>
                <span class="arabic-name">${surah.name}</span>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percent}%"></div>
            </div>
            <p class="progress-text">${progress.completed}/${surah.numberOfAyahs} ayahs • ${percent}%</p>
            
            ${progress.notes ? `
                <div class="notes">
                    <strong>Notes:</strong> ${progress.notes}
                </div>
            ` : ''}
            
            <small class="update-time">Updated: ${new Date(progress.updatedAt).toLocaleDateString()}</small>
        </div>
    `;
}

function goToSurahList() {
    window.location.href = 'index.html';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeProgressPage);