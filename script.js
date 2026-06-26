let healthHistory = JSON.parse(localStorage.getItem('healthHistory')) || [];
let userAccount = JSON.parse(localStorage.getItem('userAccount')) || null;
let savedWeeklySchedule = JSON.parse(localStorage.getItem('savedWeeklySchedule')) || null;
let globalCaloricTarget = 0;
let cumulativeCaloriesEaten = 0;

// PAGE 1 TO PAGE 2 ROUTER
function goToPage2() {
    const name = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    if (!name || !email) { alert("Please complete Name and Email fields."); return; }
    userAccount = { name: name, email: email };
    localStorage.setItem('userAccount', JSON.stringify(userAccount));
    document.getElementById('page-account').classList.add('hidden-page');
    document.getElementById('user-greeting').innerText = name;
    document.getElementById('page-metrics').classList.remove('hidden-page');
}

// PAGE 2 TO NEW SCHEDULE BUILDER ROUTER
function goToPageSchedule() {
    // Validate fields before proceeding
    const height = parseFloat(document.getElementById('height').value);
    const age = parseInt(document.getElementById('age').value);
    if (!height || !age) { alert("Height and Age selections are required."); return; }

    // Run Metabolic Calculations here to store variables early
    const goal = document.getElementById('goal').value;
    const weight = parseFloat(document.getElementById('current-weight').value);
    let baseCalories = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    globalCaloricTarget = Math.round(baseCalories * 1.375);
    if (goal === 'gain') globalCaloricTarget += 500;
    if (goal === 'lose') globalCaloricTarget -= 400;

    let proteinGrams = Math.round(weight * 2);
    let fatGrams = Math.round((globalCaloricTarget * 0.25) / 9);
    let carbGrams = Math.round((globalCaloricTarget - (proteinGrams * 4 + fatGrams * 9)) / 4);

    document.getElementById('target-calories').innerText = globalCaloricTarget;
    document.getElementById('target-carbs').innerText = carbGrams + 'g';
    document.getElementById('target-protein').innerText = proteinGrams + 'g';
    document.getElementById('target-fats').innerText = fatGrams + 'g';

    // Transition to Schedule Selector page
    document.getElementById('page-metrics').classList.add('hidden-page');
    document.getElementById('page-schedule').classList.remove('hidden-page');
}

// NEW SCHEDULE BUILDER TO ACTIVE DASHBOARD ROUTER
function saveScheduleAndGoToDashboard() {
    savedWeeklySchedule = {
        "Monday": document.getElementById('sched-monday').value,
        "Tuesday": document.getElementById('sched-tuesday').value,
        "Wednesday": document.getElementById('sched-wednesday').value,
        "Thursday": document.getElementById('sched-thursday').value,
        "Friday": document.getElementById('sched-friday').value,
        "Saturday": document.getElementById('sched-saturday').value,
        "Sunday": document.getElementById('sched-sunday').value
    };
    
    localStorage.setItem('savedWeeklySchedule', JSON.stringify(savedWeeklySchedule));

    // Move to core tracker dashboard
    document.getElementById('page-schedule').classList.add('hidden-page');
    document.getElementById('page-dashboard').classList.remove('hidden-page');
    
    initializeTodayWorkoutReminder();
    calculateLoggedCaloriesForToday();
    renderHistory();
    executeDataAnalysis();
}

// INJECTS REALTIME TODAY SCHEDULE REMINDERS
function initializeTodayWorkoutReminder() {
    const daysArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayIndex = new Date().getDay();
    const todayName = daysArr[todayIndex];

    document.getElementById('current-day-badge').innerText = todayName;

    if (savedWeeklySchedule && savedWeeklySchedule[todayName]) {
        document.getElementById('today-routine-focus').innerText = savedWeeklySchedule[todayName];
    } else {
        document.getElementById('today-routine-focus').innerText = "Rest Day";
    }
}

// MANAGES SUBMITTING EXERCISE COMPLETION OR SKIPS 
function markWorkoutState(status) {
    const textFeedback = document.getElementById('routine-status-feedback');
    
    if (status === 'Completed') {
        textFeedback.style.color = "#10b981";
        textFeedback.innerHTML = "🔥 Dynamic Adaption Activated! Awesome job staying consistent with your weight goals today.";
    } else if (status === 'Skipped') {
        textFeedback.style.color = "#ef4444";
        textFeedback.innerHTML = "❌ Workout Skipped. Ensure nutritional macros stay solid to protect current progress targets.";
    }
}

function checkMedicalWarnings(bpString) {
    const alertBox = document.getElementById('medical-alert-box');
    if (!bpString || !bpString.includes('/')) { alertBox.classList.add('hidden-page'); return; }

    const parts = bpString.split('/');
    const systolic = parseInt(parts[0]);
    const diastolic = parseInt(parts[1]);

    if (systolic >= 140 || diastolic >= 90) {
        alertBox.innerHTML = `⚠️ <strong>Medical BP Warning:</strong> Your readings (${bpString}) indicate elevated pressure levels. Watch stimulants and stay hydrated.`;
        alertBox.classList.remove('hidden-page');
    } else if (systolic < 95 || diastolic < 60) {
        alertBox.innerHTML = `⚠️ <strong>Medical BP Warning:</strong> Low blood pressure zone detected (${bpString}). Support fluid distributions.`;
        alertBox.classList.remove('hidden-page');
    } else {
        alertBox.classList.add('hidden-page');
    }
}

function logDailyStats() {
    const logWeight = document.getElementById('log-weight').value;
    const logBp = document.getElementById('log-bp').value;
    const logCalories = parseInt(document.getElementById('log-calories').value) || 0;
    const logWater = document.getElementById('log-water').value;

    if (!logWeight) { alert("Please input weight metric entry."); return; }

    const newLog = {
        date: new Date().toLocaleDateString(),
        weight: logWeight,
        bp: logBp || "N/A",
        calories: logCalories,
        water: logWater || "0"
    };

    healthHistory.unshift(newLog);
    localStorage.setItem('healthHistory', JSON.stringify(healthHistory));

    checkMedicalWarnings(logBp);
    cumulativeCaloriesEaten += logCalories;
    updateCalorieProgressBar();

    document.getElementById('log-form').reset();
    renderHistory();
    executeDataAnalysis();
}

function calculateLoggedCaloriesForToday() {
    const todayStr = new Date().toLocaleDateString();
    cumulativeCaloriesEaten = healthHistory
        .filter(item => item.date === todayStr)
        .reduce((sum, item) => sum + (parseInt(item.calories) || 0), 0);
    updateCalorieProgressBar();
}

function updateCalorieProgressBar() {
    document.getElementById('tracked-calories-display').innerText = cumulativeCaloriesEaten;
    let percentage = Math.round((cumulativeCaloriesEaten / globalCaloricTarget) * 100);
    if (percentage > 100) percentage = 100;

    const fillElement = document.getElementById('calorie-progress-fill');
    fillElement.style.width = percentage + "%";
    fillElement.innerText = percentage + "%";
}

function executeDataAnalysis() {
    const trendsText = document.getElementById('analytics-text');
    if (healthHistory.length === 0) return;

    let latestWeight = parseFloat(healthHistory[0].weight);
    let analysisOutput = `Current Recorded Weight: <strong>${latestWeight}kg</strong>. `;

    if (healthHistory.length >= 2) {
        let pastWeight = parseFloat(healthHistory[healthHistory.length - 1].weight);
        let absoluteDelta = (latestWeight - pastWeight).toFixed(1);

        if (absoluteDelta > 0) {
            analysisOutput += `Progression Trend: Advanced up by <strong>+${absoluteDelta}kg</strong> since launch tracking markers.`;
        } else if (absoluteDelta < 0) {
            analysisOutput += `Progression Trend: Weight down by <strong>${absoluteDelta}kg</strong> from start indicators. Increase meal frequency to stay in a surplus.`;
        } else {
            analysisOutput += `Progression Trend: Scale structures currently holding equilibrium.`;
        }
    } else {
        analysisOutput += `Awaiting subsequent logs to map trends.`;
    }
    trendsText.innerHTML = analysisOutput;
}

function renderHistory() {
    const container = document.getElementById('history-list');
    container.innerHTML = '';
    healthHistory.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>📅 <strong>${item.date}</strong></span>
            <span>⚖️ ${item.weight} kg</span>
            <span>❤️ BP: ${item.bp}</span>
            <span>🔥 +${item.calories} kcal</span>
        `;
        container.appendChild(li);
    });
}