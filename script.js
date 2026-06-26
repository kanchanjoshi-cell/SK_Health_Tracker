// Storage Containers
let healthHistory = JSON.parse(localStorage.getItem('healthHistory')) || [];
let userAccount = JSON.parse(localStorage.getItem('userAccount')) || null;

// Page Router 1: Moves user from Account screen to Goals Setup screen
function goToPage2() {
    const name = document.getElementById('username').value;
    const email = document.getElementById('email').value;

    if (!name || !email) {
        alert("Please complete the Name and Email fields to construct your account Profile.");
        return;
    }

    // Cache user profile locally
    userAccount = { name: name, email: email };
    localStorage.setItem('userAccount', JSON.stringify(userAccount));

    // UI Transition
    document.getElementById('page-account').classList.add('hidden-page');
    document.getElementById('user-greeting').innerText = name;
    document.getElementById('page-metrics').classList.remove('hidden-page');
}

// Page Router 2: Processes calculations and unlocks the continuous dashboard tracking log
function goToPage3() {
    const goal = document.getElementById('goal').value;
    const weight = parseFloat(document.getElementById('current-weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const age = parseInt(document.getElementById('age').value);

    if (!height || !age) {
        alert("Height and Age details are mandatory to scale metabolic baselines.");
        return;
    }

    // Mifflin-St Jeor Formula
    let baseCalories = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    let targetCalories = Math.round(baseCalories * 1.375);

    if (goal === 'gain') targetCalories += 500; // Caloric surplus adjustment
    if (goal === 'lose') targetCalories -= 400;

    let proteinGrams = Math.round(weight * 2);
    let fatGrams = Math.round((targetCalories * 0.25) / 9);
    let carbGrams = Math.round((targetCalories - (proteinGrams * 4 + fatGrams * 9)) / 4);

    // Populate UI Metrics
    document.getElementById('target-calories').innerText = targetCalories;
    document.getElementById('target-carbs').innerText = carbGrams + 'g';
    document.getElementById('target-protein').innerText = proteinGrams + 'g';
    document.getElementById('target-fats').innerText = fatGrams + 'g';

    // UI Transition
    document.getElementById('page-metrics').classList.add('hidden-page');
    document.getElementById('page-dashboard').classList.remove('hidden-page');
    renderHistory();
}

// Everyday Progress Tracker Log Actions
function logDailyStats() {
    const logWeight = document.getElementById('log-weight').value;
    const logBp = document.getElementById('log-bp').value;
    const logCalories = document.getElementById('log-calories').value;
    const logWater = document.getElementById('log-water').value;

    if (!logWeight) {
        alert("Please provide your current weight entry.");
        return;
    }

    const newLog = {
        date: new Date().toLocaleDateString(),
        weight: logWeight,
        bp: logBp || "N/A",
        calories: logCalories || "0",
        water: logWater || "0"
    };

    healthHistory.unshift(newLog);
    localStorage.setItem('healthHistory', JSON.stringify(healthHistory));

    document.getElementById('log-form').reset();
    renderHistory();
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
            <span>🔥 ${item.calories} kcal</span>
        `;
        container.appendChild(li);
    });
}