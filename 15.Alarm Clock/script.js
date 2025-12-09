const currentTime = document.querySelector("h1"),
content = document.querySelector(".content"),
selectMenu = document.querySelectorAll("select"),
setAlarmBtn = document.querySelector("button"),
alarmList = document.querySelector("#alarmList");

let alarms = [],
activeAlarmId = null,
ringtone = new Audio("./files/ringtone.mp3");

// Load alarms from localStorage
function loadAlarms() {
    const saved = localStorage.getItem("alarms");
    if (saved) {
        alarms = JSON.parse(saved);
        renderAlarmList();
    }
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

// Populate hour dropdown
for (let i = 12; i > 0; i--) {
    i = i < 10 ? `0${i}` : i;
    let option = `<option value="${i}">${i}</option>`;
    selectMenu[0].firstElementChild.insertAdjacentHTML("afterend", option);
}

// Populate minute dropdown
for (let i = 59; i >= 0; i--) {
    i = i < 10 ? `0${i}` : i;
    let option = `<option value="${i}">${i}</option>`;
    selectMenu[1].firstElementChild.insertAdjacentHTML("afterend", option);
}

// Populate AM/PM dropdown
for (let i = 2; i > 0; i--) {
    let ampm = i == 1 ? "AM" : "PM";
    let option = `<option value="${ampm}">${ampm}</option>`;
    selectMenu[2].firstElementChild.insertAdjacentHTML("afterend", option);
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
                <button class="toggle-alarm" onclick="toggleAlarm(${alarm.id})">${alarm.enabled ? "Stop" : "Start"}</button>
                <button class="delete-alarm" onclick="deleteAlarm(${alarm.id})">Delete</button>
            </div>
        `;
        alarmList.appendChild(li);
    });
}

// Add new alarm
function addAlarm() {
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
        
        if (activeAlarmId === id) {
            ringtone.pause();
            activeAlarmId = null;
        }
    }
}

// Set alarm button click handler
setAlarmBtn.addEventListener("click", addAlarm);

// Load alarms on page load
loadAlarms();