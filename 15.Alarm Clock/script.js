const currentTime = document.querySelector("h1"),
content = document.querySelector(".content"),
setAlarmBtn = document.querySelector("button"),
alarmList = document.querySelector("#alarmList"),
editModal = document.querySelector("#editModal"),
editHour = document.querySelector("#editHour"),
editMinute = document.querySelector("#editMinute"),
editAMPM = document.querySelector("#editAMPM"),
bgColorSelect = document.querySelector("#bgColorSelect");

let alarms = [],
activeAlarmId = null,
editingAlarmId = null,
selectMenu = null,
ringtone = new Audio("./files/ringtone.mp3"),
MAX_ALARMS = 10,
currentBgColor = "pastel-yellow";

// Initialize select menus
function initializeSelectMenus() {
    selectMenu = document.querySelectorAll(".content select");
    
    // Populate hour dropdown (main form)
    for (let i = 12; i > 0; i--) {
        i = i < 10 ? `0${i}` : i;
        let option = `<option value="${i}">${i}</option>`;
        selectMenu[0].firstElementChild.insertAdjacentHTML("afterend", option);
    }
    
    // Populate minute dropdown (main form)
    for (let i = 59; i >= 0; i--) {
        i = i < 10 ? `0${i}` : i;
        let option = `<option value="${i}">${i}</option>`;
        selectMenu[1].firstElementChild.insertAdjacentHTML("afterend", option);
    }
    
    // Populate AM/PM dropdown (main form)
    for (let i = 2; i > 0; i--) {
        let ampm = i == 1 ? "AM" : "PM";
        let option = `<option value="${ampm}">${ampm}</option>`;
        selectMenu[2].firstElementChild.insertAdjacentHTML("afterend", option);
    }
    
    // Populate edit modal dropdowns
    populateEditSelectOptions();
}

// Helper function to populate select options for edit modal
function populateEditSelectOptions() {
    // Populate edit hour dropdown
    for (let i = 12; i > 0; i--) {
        i = i < 10 ? `0${i}` : i;
        let option = `<option value="${i}">${i}</option>`;
        editHour.firstElementChild.insertAdjacentHTML("afterend", option);
    }
    
    // Populate edit minute dropdown
    for (let i = 59; i >= 0; i--) {
        i = i < 10 ? `0${i}` : i;
        let option = `<option value="${i}">${i}</option>`;
        editMinute.firstElementChild.insertAdjacentHTML("afterend", option);
    }
    
    // Populate edit AM/PM dropdown
    for (let i = 2; i > 0; i--) {
        let ampm = i == 1 ? "AM" : "PM";
        let option = `<option value="${ampm}">${ampm}</option>`;
        editAMPM.firstElementChild.insertAdjacentHTML("afterend", option);
    }
}

// Load alarms from localStorage
function loadAlarms() {
    const saved = localStorage.getItem("alarms");
    if (saved) {
        alarms = JSON.parse(saved);
        renderAlarmList();
        updateAlarmCount();
    }
}

// Load background color preference
function loadBackgroundColor() {
    const saved = localStorage.getItem("bgColor");
    if (saved) {
        currentBgColor = saved;
        applyBackgroundColor(saved);
    } else {
        // Apply default pastel yellow
        applyBackgroundColor("pastel-yellow");
        bgColorSelect.value = "pastel-yellow";
    }
}

// Apply background color to body
function applyBackgroundColor(colorName) {
    document.body.className = `bg-${colorName}`;
    currentBgColor = colorName;
}

// Save background color preference
function saveBackgroundColor(colorName) {
    localStorage.setItem("bgColor", colorName);
    applyBackgroundColor(colorName);
}

// Handle background color selection change
function handleBgColorChange() {
    const selectedColor = bgColorSelect.value;
    saveBackgroundColor(selectedColor);
}

// Save alarms to localStorage
function saveAlarms() {
    localStorage.setItem("alarms", JSON.stringify(alarms));
}

// Generate unique alarm ID
function generateId() {
    return Date.now();
}

// Format time for display
function formatTime(hour, minute, ampm) {
    return `${hour}:${minute} ${ampm}`;
}

// Check alarms every second
setInterval(() => {
    let date = new Date(),
    h = date.getHours(),
    m = date.getMinutes(),
    s = date.getSeconds(),
    ampm = "AM";
    if(h >= 12) {
        h = h - 12;
        ampm = "PM";
    }
    h = h == 0 ? h = 12 : h;
    h = h < 10 ? "0" + h : h;
    m = m < 10 ? "0" + m : m;
    s = s < 10 ? "0" + s : s;
    currentTime.innerText = `${h}:${m}:${s} ${ampm}`;

    // Check if any alarm should trigger
    alarms.forEach(alarm => {
        if (alarm.enabled && alarm.time === `${h}:${m} ${ampm}`) {
            if (activeAlarmId !== alarm.id) {
                activeAlarmId = alarm.id;
                ringtone.currentTime = 0;
                ringtone.play();
                ringtone.loop = true;
            }
        }
    });
});

// Render alarm list
function renderAlarmList() {
    alarmList.innerHTML = "";
    
    if (alarms.length === 0) {
        alarmList.innerHTML = '<li class="empty-message">No alarms set yet</li>';
        return;
    }
    
    alarms.forEach(alarm => {
        const li = document.createElement("li");
        li.className = `alarm-item ${alarm.enabled ? "active" : ""}`;
        li.innerHTML = `
            <div class="alarm-info">
                <div class="alarm-time">${alarm.time}</div>
                <div class="alarm-label">${alarm.enabled ? "Active" : "Inactive"}</div>
            </div>
            <div class="alarm-actions">
                <button class="edit-alarm" onclick="openEditModal(${alarm.id})">Edit</button>
                <button class="toggle-alarm" onclick="toggleAlarm(${alarm.id})">${alarm.enabled ? "Stop" : "Start"}</button>
                <button class="delete-alarm" onclick="deleteAlarm(${alarm.id})">Delete</button>
            </div>
        `;
        alarmList.appendChild(li);
    });
}

// Update alarm count display
function updateAlarmCount() {
    const alarmCount = document.querySelector(".alarm-count");
    if (alarmCount) {
        alarmCount.textContent = `(${alarms.length}/${MAX_ALARMS})`;
    }
}

// Add new alarm
function addAlarm() {
    // Check maximum alarms limit
    if (alarms.length >= MAX_ALARMS) {
        return alert(`Maximum number of alarms (${MAX_ALARMS}) reached! Please delete an alarm first.`);
    }
    
    let time = `${selectMenu[0].value}:${selectMenu[1].value} ${selectMenu[2].value}`;
    
    if (time.includes("Hour") || time.includes("Minute") || time.includes("AM/PM")) {
        return alert("Please select a valid time to set Alarm!");
    }
    
    // Check if alarm already exists
    if (alarms.some(alarm => alarm.time === time)) {
        return alert("An alarm for this time already exists!");
    }
    
    const newAlarm = {
        id: generateId(),
        time: time,
        enabled: true
    };
    
    alarms.push(newAlarm);
    saveAlarms();
    renderAlarmList();
    updateAlarmCount();
    
    // Reset form
    selectMenu[0].value = "Hour";
    selectMenu[1].value = "Minute";
    selectMenu[2].value = "AM/PM";
    
    alert(`Alarm set for ${time}`);
}

// Toggle alarm enabled/disabled
function toggleAlarm(id) {
    const alarm = alarms.find(a => a.id === id);
    if (alarm) {
        alarm.enabled = !alarm.enabled;
        saveAlarms();
        renderAlarmList();
        
        if (!alarm.enabled && activeAlarmId === id) {
            ringtone.pause();
            activeAlarmId = null;
        }
    }
}

// Delete alarm
function deleteAlarm(id) {
    if (confirm("Are you sure you want to delete this alarm?")) {
        alarms = alarms.filter(a => a.id !== id);
        saveAlarms();
        renderAlarmList();
        updateAlarmCount();
        
        if (activeAlarmId === id) {
            ringtone.pause();
            activeAlarmId = null;
        }
    }
}

// Open edit modal
function openEditModal(id) {
    editingAlarmId = id;
    const alarm = alarms.find(a => a.id === id);
    
    if (!alarm) return;
    
    const [hour, minute] = alarm.time.split(":");
    const [mins, ampm] = minute.split(" ");
    
    editHour.value = hour;
    editMinute.value = mins;
    editAMPM.value = ampm;
    
    editModal.classList.remove("hidden");
}

// Close edit modal
function closeEditModal() {
    editModal.classList.add("hidden");
    editingAlarmId = null;
    editHour.value = "Hour";
    editMinute.value = "Minute";
    editAMPM.value = "AM/PM";
}

// Save edited alarm
function saveEditedAlarm() {
    if (!editingAlarmId) return;
    
    const newTime = `${editHour.value}:${editMinute.value} ${editAMPM.value}`;
    
    if (newTime.includes("Hour") || newTime.includes("Minute") || newTime.includes("AM/PM")) {
        return alert("Please select valid time values!");
    }
    
    // Check if new time already exists (excluding current alarm)
    if (alarms.some(alarm => alarm.time === newTime && alarm.id !== editingAlarmId)) {
        return alert("An alarm for this time already exists!");
    }
    
    const alarm = alarms.find(a => a.id === editingAlarmId);
    if (alarm) {
        alarm.time = newTime;
        saveAlarms();
        renderAlarmList();
        closeEditModal();
        alert(`Alarm updated to ${newTime}`);
    }
}

// Set alarm button click handler
setAlarmBtn.addEventListener("click", addAlarm);

// Background color selector event listener
bgColorSelect.addEventListener("change", handleBgColorChange);

// Initialize and load on page load
initializeSelectMenus();
loadAlarms();
loadBackgroundColor();
