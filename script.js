let healthHistory = JSON.parse(localStorage.getItem('healthHistory')) || [];
let userAccount = JSON.parse(localStorage.getItem('userAccount')) || null;
let savedWeeklySchedule = JSON.parse(localStorage.getItem('savedWeeklySchedule')) || null;
let globalCaloricTarget = 0;
let cumulativeCaloriesEaten = 0;

// Dynamic tracked macros accumulation targets
let cumulativeCarbsEaten = 0;
let cumulativeProteinEaten = 0;
let cumulativeFatsEaten = 0;

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
    const height = parseFloat(document.getElementById('height').value);
    const age = parseInt(document.getElementById('age').value);
    if (!height || !age) { alert("Height and Age selections are required."); return; }

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

    document.getElementById('page-metrics').classList.add('hidden-page');
    document.getElementById('page-schedule').classList.remove('hidden-page');
}

function getCustomSelectedOptions(dayId) {
    const container = document.getElementById(dayId);
    if (!container) return "Rest Day";
    const checkedCheckboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const values = Array.from(checkedCheckboxes).map(cb => cb.value);
    return values.length > 0 ? values.join(' + ') : "Rest Day";
}

function saveScheduleAndGoToDashboard() {
    savedWeeklySchedule = {
        "Monday": getCustomSelectedOptions('sched-monday'),
        "Tuesday": getCustomSelectedOptions('sched-tuesday'),
        "Wednesday": getCustomSelectedOptions('sched-wednesday'),
        "Thursday": getCustomSelectedOptions('sched-thursday'),
        "Friday": getCustomSelectedOptions('sched-friday'),
        "Saturday": getCustomSelectedOptions('sched-saturday'),
        "Sunday": getCustomSelectedOptions('sched-sunday')
    };
    
    localStorage.setItem('savedWeeklySchedule', JSON.stringify(savedWeeklySchedule));
    document.getElementById('page-schedule').classList.add('hidden-page');
    document.getElementById('page-dashboard').classList.remove('hidden-page');
    
    initializeTodayWorkoutReminder();
    calculateLoggedCaloriesForToday();
    renderHistory();
    executeDataAnalysis();
}

function initializeTodayWorkoutReminder() {
    const daysArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = daysArr[new Date().getDay()];

    document.getElementById('current-day-badge').innerText = todayName;

    if (savedWeeklySchedule && savedWeeklySchedule[todayName]) {
        document.getElementById('today-routine-focus').innerText = savedWeeklySchedule[todayName];
    } else {
        document.getElementById('today-routine-focus').innerText = "Rest Day";
    }
}

function markWorkoutState(status) {
    const textFeedback = document.getElementById('routine-status-feedback');
    if (status === 'Completed') {
        textFeedback.style.color = "#10b981";
        textFeedback.innerHTML = "🔥 Dynamic Adaption Activated! Awesome job staying consistent with your split today.";
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
        alertBox.innerHTML = `⚠️ <strong>Medical BP Warning:</strong> Readings (${bpString}) indicate elevated pressure levels.`;
        alertBox.classList.remove('hidden-page');
    } else if (systolic < 95 || diastolic < 60) {
        alertBox.innerHTML = `⚠️ <strong>Medical BP Warning:</strong> Low blood pressure zone detected (${bpString}).`;
        alertBox.classList.remove('hidden-page');
    } else {
        alertBox.classList.add('hidden-page');
    }
}

// FIXED: Updates weight cleanly without interfering with everyday meals
function updateCurrentWeightOnly() {
    const weightInput = document.getElementById('log-weight-only').value;
    if (!weightInput) { alert("Please enter a valid weight!"); return; }
    
    document.getElementById('current-weight').value = weightInput;

    const newLog = {
        date: new Date().toLocaleDateString() + " (Weight Check)",
        weight: weightInput,
        bp: "N/A",
        calories: 0,
        water: "0",
        carbs: 0,
        protein: 0,
        fats: 0
    };

    healthHistory.unshift(newLog);
    localStorage.setItem('healthHistory', JSON.stringify(healthHistory));
    alert("Today's weight updated successfully!");
    
    document.getElementById('log-weight-only').value = '';
    renderHistory();
    executeDataAnalysis();
}

// FIXED: Logs everyday meals/water seamlessly
function logDailyStats() {
    // Fallback checks to prevent any undefined breaks
    let logWeight = document.getElementById('log-weight-only') ? document.getElementById('log-weight-only').value : "";
    if (!logWeight) {
        const fallbackWeight = document.getElementById('current-weight').value;
        logWeight = fallbackWeight ? fallbackWeight : "N/A";
    }

    const logBp = document.getElementById('log-bp').value;
    const logCalories = parseInt(document.getElementById('log-calories').value) || 0;
    const logWater = document.getElementById('log-water').value;
    
    const logCarbs = parseInt(document.getElementById('log-carbs').value) || 0;
    const logProtein = parseInt(document.getElementById('log-protein').value) || 0;
    const logFats = parseInt(document.getElementById('log-fats').value) || 0;

    const newLog = {
        date: new Date().toLocaleDateString(),
        weight: logWeight,
        bp: logBp || "N/A",
        calories: logCalories,
        water: logWater || "0",
        carbs: logCarbs,
        protein: logProtein,
        fats: logFats
    };

    healthHistory.unshift(newLog);
    localStorage.setItem('healthHistory', JSON.stringify(healthHistory));

    checkMedicalWarnings(logBp);
    
    cumulativeCaloriesEaten += logCalories;
    cumulativeCarbsEaten += logCarbs;
    cumulativeProteinEaten += logProtein;
    cumulativeFatsEaten += logFats;
    
    updateCalorieProgressBar();

    document.getElementById('log-form').reset();
    renderHistory();
    executeDataAnalysis();
}

function calculateLoggedCaloriesForToday() {
    const todayStr = new Date().toLocaleDateString();
    const todaysLogs = healthHistory.filter(item => item.date.startsWith(todayStr));
    
    cumulativeCaloriesEaten = todaysLogs.reduce((sum, item) => sum + (parseInt(item.calories) || 0), 0);
    cumulativeCarbsEaten = todaysLogs.reduce((sum, item) => sum + (parseInt(item.carbs) || 0), 0);
    cumulativeProteinEaten = todaysLogs.reduce((sum, item) => sum + (parseInt(item.protein) || 0), 0);
    cumulativeFatsEaten = todaysLogs.reduce((sum, item) => sum + (parseInt(item.fats) || 0), 0);
    
    updateCalorieProgressBar();
}

function updateCalorieProgressBar() {
    if(document.getElementById('tracked-calories-display')) {
        document.getElementById('tracked-calories-display').innerText = cumulativeCaloriesEaten;
    }
    if(document.getElementById('tracked-carbs-display')) {
        document.getElementById('tracked-carbs-display').innerText = cumulativeCarbsEaten;
    }
    if(document.getElementById('tracked-protein-display')) {
        document.getElementById('tracked-protein-display').innerText = cumulativeProteinEaten;
    }
    if(document.getElementById('tracked-fats-display')) {
        document.getElementById('tracked-fats-display').innerText = cumulativeFatsEaten;
    }

    let percentage = Math.round((cumulativeCaloriesEaten / globalCaloricTarget) * 100) || 0;
    if (percentage > 100) percentage = 100;

    const fillElement = document.getElementById('calorie-progress-fill');
    if (fillElement) {
        fillElement.style.width = percentage + "%";
        fillElement.innerText = percentage + "%";
    }
}

function executeDataAnalysis() {
    const trendsText = document.getElementById('analytics-text');
    if (!trendsText || healthHistory.length === 0) return;

    let latestWeight = parseFloat(healthHistory[0].weight);
    if (isNaN(latestWeight)) {
        trendsText.innerHTML = "Provide standard entry logs to view scale progression tracks.";
        return;
    }

    let analysisOutput = `Current Recorded Weight: <strong>${latestWeight}kg</strong>. `;
    if (healthHistory.length >= 2) {
        let pastWeight = parseFloat(healthHistory[healthHistory.length - 1].weight);
        if(!isNaN(pastWeight)) {
            let absoluteDelta = (latestWeight - pastWeight).toFixed(1);
            if (absoluteDelta > 0) {
                analysisOutput += `Progression Trend: Advanced up by <strong>+${absoluteDelta}kg</strong>.`;
            } else if (absoluteDelta < 0) {
                analysisOutput += `Progression Trend: Weight down by <strong>${absoluteDelta}kg</strong>.`;
            } else {
                analysisOutput += `Progression Trend: Scale structures holding equilibrium.`;
            }
        }
    }
    trendsText.innerHTML = analysisOutput;
}

function renderHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;
    container.innerHTML = '';
    healthHistory.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>📅 <strong>${item.date}</strong></span>
            <span>⚖️ ${item.weight !== "N/A" ? item.weight + " kg" : "Unchanged"}</span>
            <span>🍞 C: ${item.carbs || 0}g | 🍗 P: ${item.protein || 0}g</span>
            <span>🔥 +${item.calories} kcal</span>
        `;
        container.appendChild(li);
    });
}

document.querySelectorAll(".select-box").forEach(box => {
    box.addEventListener("click", function() {
        this.nextElementSibling.classList.toggle("show");
    });
});