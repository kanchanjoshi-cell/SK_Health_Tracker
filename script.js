let healthHistory = JSON.parse(localStorage.getItem('healthHistory')) || [];
let userAccount = JSON.parse(localStorage.getItem('userAccount')) || null;
let savedWeeklySchedule = JSON.parse(localStorage.getItem('savedWeeklySchedule')) || null;
let globalCaloricTarget = 0;
let cumulativeCaloriesEaten = 0;

let cumulativeCarbsEaten = 0;
let cumulativeProteinEaten = 0;
let cumulativeFatsEaten = 0;

// High-Fidelity Leaflet Engine Configurations
let map = null;
let pathPolyline = null;
let userMarker = null;
let geoWatchId = null;
let isTrackingCardio = false;
let cardioStartTime = null;
let cardioTimerInterval = null;
let trackedPathCoordinates = [];
let totalCardioDistanceKm = 0;
let estimatedCaloriesBurned = 0;

// Seed Fallback Coordinates (New Delhi center base lines)
let virtualLat = 28.6139; 
let virtualLng = 77.2090;

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
    initLeafletFreeMap();
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
    if (!alertBox || !bpString || !bpString.includes('/')) { if(alertBox) alertBox.classList.add('hidden-page'); return; }

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

// 100% FREE LEAFLET ENGINE INITIALIZATION
function initLeafletFreeMap() {
    const mapElement = document.getElementById('cardio-map');
    if (!mapElement || typeof L === 'undefined') return;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            virtualLat = position.coords.latitude;
            virtualLng = position.coords.longitude;
            buildLeafletInstance();
        }, () => {
            buildLeafletInstance();
        });
    } else {
        buildLeafletInstance();
    }
}

function buildLeafletInstance() {
    // Instantiate free map view grid context
    map = L.map('cardio-map', {
        zoomControl: false,
        attributionControl: false
    }).setView([virtualLat, virtualLng], 16);

    // Add high resolution standard street imagery overlay layers for free
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    pathPolyline = L.polyline([], {
        color: '#38bdf8',
        weight: 5,
        opacity: 0.95
    }).addTo(map);

    // Append beautiful minimal neon radar marker tracker pulse node
    userMarker = L.circleMarker([virtualLat, virtualLng], {
        color: '#38bdf8',
        fillColor: '#0ea5e9',
        fillOpacity: 0.8,
        radius: 8
    }).addTo(map);
}

function toggleCardioTracking() {
    const btn = document.getElementById('btn-toggle-cardio');
    if (!isTrackingCardio) {
        isTrackingCardio = true;
        btn.innerText = "🛑 Stop Tracking & Log Data";
        btn.className = "btn-cardio-ctrl state-stop";
        
        cardioStartTime = new Date();
        trackedPathCoordinates = [];
        totalCardioDistanceKm = 0;
        estimatedCaloriesBurned = 0;

        document.getElementById('cardio-distance').innerText = "0.00 km";
        document.getElementById('cardio-speed').innerText = "0.0 km/h";
        document.getElementById('cardio-burned').innerText = "0 kcal";

        cardioTimerInterval = setInterval(updateCardioPipelineDataStream, 1000);

        if (navigator.geolocation) {
            geoWatchId = navigator.geolocation.watchPosition(handleGPSMovementSuccess, handleGPSError, {
                enableHighAccuracy: true,
                maximumAge: 1000
            });
        }
    } else {
        isTrackingCardio = false;
        btn.innerText = "⚡ Initialize Live Tracking";
        btn.className = "btn-cardio-ctrl state-start";

        clearInterval(cardioTimerInterval);
        if (navigator.geolocation && geoWatchId) {
            navigator.geolocation.clearWatch(geoWatchId);
        }

        saveCardioSessionToLogs();
    }
}

function updateCardioPipelineDataStream() {
    if (!cardioStartTime) return;
    const totalSecs = Math.floor((new Date() - cardioStartTime) / 1000);
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    document.getElementById('cardio-duration').innerText = `${mins}:${secs}`;
    
    const activityMode = document.getElementById('cardio-type').value;
    
    // Smooth Indoor/Stationary Simulation Mode
    // If you're testing indoors or your coordinates aren't updating rapidly, 
    // it smoothly calculates real-world metrics based on standard MET equations!
    if (trackedPathCoordinates.length < 2) {
        let paceSpeedStep = activityMode === 'cycling' ? 0.004 : 0.0012;
        totalCardioDistanceKm += paceSpeedStep;
        
        virtualLat += (Math.random() - 0.5) * 0.00012;
        virtualLng += (Math.random() - 0.5) * 0.00012;
        
        if (map && pathPolyline && userMarker) {
            pathPolyline.addLatLng([virtualLat, virtualLng]);
            userMarker.setLatLng([virtualLat, virtualLng]);
            map.panTo([virtualLat, virtualLng]);
        }

        const elapsedHrs = (totalSecs / 3600);
        const calcVelocity = elapsedHrs > 0 ? (totalCardioDistanceKm / elapsedHrs) : 0;
        const currentWeight = parseFloat(document.getElementById('current-weight').value) || 50;
        const metRatio = activityMode === 'cycling' ? 8.0 : 4.5;
        
        estimatedCaloriesBurned = Math.round(metRatio * currentWeight * elapsedHrs);

        document.getElementById('cardio-distance').innerText = `${totalCardioDistanceKm.toFixed(2)} km`;
        document.getElementById('cardio-speed').innerText = `${Math.min(calcVelocity, activityMode === 'cycling' ? 20 : 5.5).toFixed(1)} km/h`;
        document.getElementById('cardio-burned').innerText = `${estimatedCaloriesBurned} kcal`;
    }
}

function handleGPSMovementSuccess(position) {
    if (!isTrackingCardio) return;
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    
    let currentSpeedKmh = position.coords.speed ? (position.coords.speed * 3.6) : 0;

    if (map && pathPolyline && userMarker) {
        const currentPoint = [lat, lng];
        trackedPathCoordinates.push(currentPoint);
        pathPolyline.setPath(trackedPathCoordinates);
        userMarker.setLatLng(currentPoint);
        map.setView(currentPoint);

        if (trackedPathCoordinates.length > 1) {
            const lastPoint = trackedPathCoordinates[trackedPathCoordinates.length - 2];
            // Haversine direct absolute metric distance delta math algorithm logic
            const distanceDelta = map.distance(lastPoint, currentPoint) / 1000; // returns meters, convert to km
            totalCardioDistanceKm += distanceDelta;
        }

        document.getElementById('cardio-distance').innerText = `${totalCardioDistanceKm.toFixed(2)} km`;
        document.getElementById('cardio-speed').innerText = `${currentSpeedKmh.toFixed(1)} km/h`;
    }
}

function handleGPSError(err) {
    console.warn(`GPS Satellite Feed Error code: ${err.message}`);
}

function saveCardioSessionToLogs() {
    const activityMode = document.getElementById('cardio-type').value;
    const sessionDuration = document.getElementById('cardio-duration').innerText;
    
    const cardioLogItem = {
        date: new Date().toLocaleDateString() + ` (${activityMode.toUpperCase()})`,
        weight: "N/A",
        bp: "🏃 Track Complete",
        calories: -estimatedCaloriesBurned, 
        water: `${totalCardioDistanceKm.toFixed(2)} km [Time: ${sessionDuration}]`,
        carbs: 0,
        protein: 0,
        fats: 0
    };

    healthHistory.unshift(cardioLogItem);
    localStorage.setItem('healthHistory', JSON.stringify(healthHistory));
    alert(`Cardio Activity Saved Successfully!\nDistance covered: ${totalCardioDistanceKm.toFixed(2)} km\nCalories burned: ${estimatedCaloriesBurned} kcal`);
    
    renderHistory();
    executeDataAnalysis();
}

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

function logDailyStats() {
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
        const calText = item.calories < 0 ? `${item.calories} kcal 🔥` : `+${item.calories} kcal`;
        const metricSubtext = item.bp.includes("Track") ? `🛰️ Dist: ${item.water}` : `❤️ BP: ${item.bp}`;
        
        li.innerHTML = `
            <span>📅 <strong>${item.date}</strong></span>
            <span>⚖️ ${item.weight !== "N/A" ? item.weight + " kg" : "Cardio Loop"}</span>
            <span>${metricSubtext}</span>
            <span>${calText}</span>
        `;
        container.appendChild(li);
    });
}

document.querySelectorAll(".select-box").forEach(box => {
    box.addEventListener("click", function() {
        this.nextElementSibling.classList.toggle("show");
    });
});