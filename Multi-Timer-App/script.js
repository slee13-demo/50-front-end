// Multi-Timer Management System
// Based on specifications from RDD-4

class TimerManager {
    constructor() {
        this.timers = [];
        this.maxTimers = 10;
        this.timerIntervals = new Map();
        this.currentEditingTimer = null;
        this.sortCriteria = 'created-desc';
        this.filterCriteria = 'all';
        this.searchQuery = '';
        
        // Audio context for alarms
        this.alarmAudio = document.getElementById('alarmAudio');
        this.soundFiles = {
            chime: './sounds/chime.mp3',
            bell: './sounds/bell.mp3',
            melody: './sounds/melody.mp3',
            beep: './sounds/beep.mp3',
            buzz: './sounds/buzz.mp3'
        };
        
        this.init();
    }
    
    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.populateDurationSelects();
        this.requestNotificationPermission();
        this.updateUI();
    }
    
    // ==================== TIMER CRUD OPERATIONS ====================
    
    createTimer(config) {
        if (this.timers.length >= this.maxTimers) {
            this.showToast('Maximum timer limit reached (10 timers)', 'error');
            return false;
        }
        
        // Validate timer name uniqueness
        if (this.timers.some(timer => timer.name.toLowerCase() === config.name.toLowerCase())) {
            this.showToast('Timer name already exists', 'error');
            return false;
        }
        
        const timer = {
            id: this.generateUUID(),
            name: config.name,
            originalDuration: config.duration,
            remainingTime: config.duration,
            status: 'stopped',
            createdAt: new Date(),
            lastModified: new Date(),
            alarmSettings: {
                soundFile: config.alarmSettings.soundFile,
                volume: config.alarmSettings.volume,
                repeat: config.alarmSettings.repeat,
                repeatInterval: config.alarmSettings.repeatInterval || 5,
                browserNotification: config.alarmSettings.browserNotification
            },
            description: config.description || '',
            progress: 0
        };
        
        this.timers.unshift(timer);
        this.saveToStorage();
        this.updateUI();
        this.showToast(`Timer "${timer.name}" created successfully`, 'success');
        return timer;
    }
    
    updateTimer(id, updates) {
        const timer = this.findTimer(id);
        if (!timer) {
            this.showToast('Timer not found', 'error');
            return false;
        }
        
        // Validate name uniqueness if name is being updated
        if (updates.name && updates.name !== timer.name) {
            if (this.timers.some(t => t.id !== id && t.name.toLowerCase() === updates.name.toLowerCase())) {
                this.showToast('Timer name already exists', 'error');
                return false;
            }
        }
        
        // Handle duration updates for running/paused timers
        if (updates.originalDuration && updates.originalDuration !== timer.originalDuration) {
            if (timer.status === 'stopped') {
                timer.remainingTime = updates.originalDuration;
            } else {
                // For running/paused timers, adjust remaining time proportionally
                const progressPercent = (timer.originalDuration - timer.remainingTime) / timer.originalDuration;
                timer.remainingTime = updates.originalDuration - (updates.originalDuration * progressPercent);
            }
        }
        
        Object.assign(timer, updates, { 
            lastModified: new Date(),
            progress: this.calculateProgress(timer)
        });
        
        this.saveToStorage();
        this.updateUI();
        this.showToast(`Timer "${timer.name}" updated successfully`, 'success');
        return timer;
    }
    
    deleteTimer(id) {
        const timer = this.findTimer(id);
        if (!timer) {
            this.showToast('Timer not found', 'error');
            return false;
        }
        
        // Stop timer if running
        if (timer.status === 'running' || timer.status === 'paused') {
            this.stopTimer(id);
        }
        
        const index = this.timers.findIndex(t => t.id === id);
        const timerName = timer.name;
        this.timers.splice(index, 1);
        
        this.saveToStorage();
        this.updateUI();
        this.showToast(`Timer "${timerName}" deleted successfully`, 'info');
        return true;
    }
    
    // ==================== TIMER CONTROL OPERATIONS ====================
    
    startTimer(id) {
        const timer = this.findTimer(id);
        if (!timer || timer.remainingTime <= 0) return false;
        
        timer.status = 'running';
        timer.lastModified = new Date();
        
        const interval = setInterval(() => {
            timer.remainingTime -= 1000;
            timer.progress = this.calculateProgress(timer);
            
            this.updateTimerDisplay(timer);
            
            if (timer.remainingTime <= 0) {
                this.completeTimer(id);
            }
        }, 1000);
        
        this.timerIntervals.set(id, interval);
        this.updateUI();
        this.showToast(`Timer "${timer.name}" started`, 'success');
        return true;
    }
    
    pauseTimer(id) {
        const timer = this.findTimer(id);
        if (!timer || timer.status !== 'running') return false;
        
        const interval = this.timerIntervals.get(id);
        if (interval) {
            clearInterval(interval);
            this.timerIntervals.delete(id);
        }
        
        timer.status = 'paused';
        timer.lastModified = new Date();
        
        this.updateUI();
        this.showToast(`Timer "${timer.name}" paused`, 'warning');
        return true;
    }
    
    stopTimer(id) {
        const timer = this.findTimer(id);
        if (!timer) return false;
        
        const interval = this.timerIntervals.get(id);
        if (interval) {
            clearInterval(interval);
            this.timerIntervals.delete(id);
        }
        
        timer.status = 'stopped';
        timer.remainingTime = timer.originalDuration;
        timer.progress = 0;
        timer.lastModified = new Date();
        
        this.updateUI();
        this.showToast(`Timer "${timer.name}" stopped`, 'info');
        return true;
    }
    
    resetTimer(id) {
        const timer = this.findTimer(id);
        if (!timer) return false;
        
        // Stop if running
        if (timer.status === 'running' || timer.status === 'paused') {
            this.stopTimer(id);
        }
        
        timer.status = 'stopped';
        timer.remainingTime = timer.originalDuration;
        timer.progress = 0;
        timer.completedAt = null;
        timer.lastModified = new Date();
        
        this.updateUI();
        this.showToast(`Timer "${timer.name}" reset`, 'info');
        return true;
    }
    
    completeTimer(id) {
        const timer = this.findTimer(id);
        if (!timer) return;
        
        const interval = this.timerIntervals.get(id);
        if (interval) {
            clearInterval(interval);
            this.timerIntervals.delete(id);
        }
        
        timer.status = 'completed';
        timer.remainingTime = 0;
        timer.progress = 100;
        timer.completedAt = new Date();
        timer.lastModified = new Date();
        
        this.triggerAlarm(timer);
        this.updateUI();
        this.saveToStorage();
    }
    
    // ==================== ALARM SYSTEM ====================
    
    async triggerAlarm(timer) {
        // Play sound
        try {
            this.alarmAudio.src = this.soundFiles[timer.alarmSettings.soundFile] || this.soundFiles.chime;
            this.alarmAudio.volume = timer.alarmSettings.volume / 100;
            await this.alarmAudio.play();
            
            if (timer.alarmSettings.repeat) {
                this.setupAlarmRepeat(timer);
            }
        } catch (error) {
            console.warn('Failed to play alarm sound:', error);
        }
        
        // Show browser notification
        if (timer.alarmSettings.browserNotification && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`Timer Completed: ${timer.name}`, {
                body: `Your timer has finished at ${new Date().toLocaleTimeString()}`,
                icon: './favicon.ico',
                badge: './favicon.ico',
                requireInteraction: true
            });
        }
        
        // Show completion toast
        this.showToast(`🎉 Timer "${timer.name}" completed!`, 'success', 5000);
    }
    
    setupAlarmRepeat(timer) {
        if (!timer.alarmSettings.repeat) return;
        
        const repeatInterval = setInterval(() => {
            if (timer.status !== 'completed') {
                clearInterval(repeatInterval);
                return;
            }
            
            try {
                this.alarmAudio.currentTime = 0;
                this.alarmAudio.play();
            } catch (error) {
                console.warn('Failed to repeat alarm:', error);
                clearInterval(repeatInterval);
            }
        }, timer.alarmSettings.repeatInterval * 60 * 1000);
    }
    
    stopAllAlarms() {
        this.alarmAudio.pause();
        this.alarmAudio.currentTime = 0;
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    findTimer(id) {
        return this.timers.find(timer => timer.id === id);
    }
    
    calculateProgress(timer) {
        if (timer.originalDuration === 0) return 0;
        return Math.max(0, Math.min(100, ((timer.originalDuration - timer.remainingTime) / timer.originalDuration) * 100));
    }
    
    generateUUID() {
        return 'timer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    formatTime(ms) {
        if (ms < 0) ms = 0;
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    parseDuration(hours, minutes, seconds) {
        return (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)) * 1000;
    }
    
    // ==================== STORAGE MANAGEMENT ====================
    
    saveToStorage() {
        try {
            const data = {
                timers: this.timers.map(timer => ({
                    ...timer,
                    createdAt: timer.createdAt.toISOString(),
                    lastModified: timer.lastModified.toISOString(),
                    completedAt: timer.completedAt ? timer.completedAt.toISOString() : null
                })),
                settings: {
                    sortCriteria: this.sortCriteria,
                    filterCriteria: this.filterCriteria
                },
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem('multi-timer-data', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save to storage:', error);
            this.showToast('Failed to save timer data', 'error');
        }
    }
    
    loadFromStorage() {
        try {
            const data = localStorage.getItem('multi-timer-data');
            if (!data) return;
            
            const parsed = JSON.parse(data);
            this.timers = parsed.timers.map(timer => ({
                ...timer,
                createdAt: new Date(timer.createdAt),
                lastModified: new Date(timer.lastModified),
                completedAt: timer.completedAt ? new Date(timer.completedAt) : null
            }));
            
            if (parsed.settings) {
                this.sortCriteria = parsed.settings.sortCriteria || 'created-desc';
                this.filterCriteria = parsed.settings.filterCriteria || 'all';
            }
            
            // Reset all running timers to paused state on page load
            this.timers.forEach(timer => {
                if (timer.status === 'running') {
                    timer.status = 'paused';
                }
            });
            
        } catch (error) {
            console.error('Failed to load from storage:', error);
            this.showToast('Failed to load timer data', 'error');
        }
    }
    
    clearStorage() {
        localStorage.removeItem('multi-timer-data');
        this.timers = [];
        this.updateUI();
        this.showToast('All timer data cleared', 'info');
    }
    
    // ==================== SORTING AND FILTERING ====================
    
    getFilteredAndSortedTimers() {
        let filtered = this.timers;
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(timer => 
                timer.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                timer.description.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }
        
        // Apply status filter
        if (this.filterCriteria !== 'all') {
            filtered = filtered.filter(timer => timer.status === this.filterCriteria);
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.sortCriteria) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'time-asc':
                    return a.remainingTime - b.remainingTime;
                case 'time-desc':
                    return b.remainingTime - a.remainingTime;
                case 'status':
                    return a.status.localeCompare(b.status);
                case 'created-asc':
                    return a.createdAt - b.createdAt;
                case 'created-desc':
                    return b.createdAt - a.createdAt;
                default:
                    return 0;
            }
        });
        
        return filtered;
    }
    
    updateSort(criteria) {
        this.sortCriteria = criteria;
        this.saveToStorage();
        this.updateUI();
    }
    
    updateFilter(criteria) {
        this.filterCriteria = criteria;
        this.saveToStorage();
        this.updateUI();
    }
    
    updateSearch(query) {
        this.searchQuery = query;
        this.updateUI();
    }
    
    // ==================== UI MANAGEMENT ====================
    
    updateUI() {
        this.renderTimerList();
        this.updateStats();
        this.updateFooter();
        this.updateSortFilterControls();
    }
    
    renderTimerList() {
        const timerList = document.getElementById('timerList');
        const emptyState = document.getElementById('emptyState');
        const filteredTimers = this.getFilteredAndSortedTimers();
        
        if (filteredTimers.length === 0) {
            timerList.innerHTML = '';
            if (this.timers.length === 0) {
                emptyState.style.display = 'block';
            } else {
                // Show "no results" message for search/filter
                timerList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search empty-icon"></i>
                        <h2 class="empty-title">No Timers Found</h2>
                        <p class="empty-description">No timers match your current search or filter criteria.</p>
                    </div>
                `;
                emptyState.style.display = 'none';
            }
            return;
        }
        
        emptyState.style.display = 'none';
        timerList.innerHTML = filteredTimers.map(timer => this.createTimerCardHTML(timer)).join('');
        
        // Add event listeners to timer cards
        filteredTimers.forEach(timer => {
            this.attachTimerCardListeners(timer);
        });
    }
    
    createTimerCardHTML(timer) {
        const statusClass = timer.status;
        const statusIcon = this.getStatusIcon(timer.status);
        const timeClass = timer.status;
        const progressClass = timer.status;
        
        return `
            <div class="timer-card ${statusClass}" data-timer-id="${timer.id}">
                <div class="timer-header">
                    <div class="timer-info">
                        <div class="timer-status-icon ${statusClass}">
                            ${statusIcon}
                        </div>
                        <h3 class="timer-name">${this.escapeHTML(timer.name)}</h3>
                    </div>
                    <div class="timer-actions">
                        <button class="action-btn edit-btn" data-action="edit" data-timer-id="${timer.id}" aria-label="Edit timer">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" data-action="delete" data-timer-id="${timer.id}" aria-label="Delete timer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="timer-body">
                    <div class="timer-display">
                        <div class="timer-time ${timeClass}" id="time-${timer.id}">
                            ${this.formatTime(timer.remainingTime)}
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill ${progressClass}" style="width: ${timer.progress}%" id="progress-${timer.id}"></div>
                        </div>
                    </div>
                    <div class="timer-controls">
                        ${this.getControlButtonsHTML(timer)}
                    </div>
                </div>
                <div class="timer-footer">
                    <div class="alarm-info">
                        <i class="fas fa-volume-up alarm-icon"></i>
                        <span>${this.getAlarmText(timer.alarmSettings)}</span>
                    </div>
                    <div class="timer-meta">
                        <span>Created: ${timer.createdAt.toLocaleTimeString()}</span>
                        ${timer.completedAt ? `<span>Completed: ${timer.completedAt.toLocaleTimeString()}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    getStatusIcon(status) {
        switch (status) {
            case 'running': return '<i class="fas fa-play"></i>';
            case 'paused': return '<i class="fas fa-pause"></i>';
            case 'stopped': return '<i class="fas fa-stop"></i>';
            case 'completed': return '<i class="fas fa-check"></i>';
            default: return '<i class="fas fa-clock"></i>';
        }
    }
    
    getControlButtonsHTML(timer) {
        switch (timer.status) {
            case 'stopped':
                return `
                    <button class="control-btn start-btn" data-action="start" data-timer-id="${timer.id}">
                        <i class="fas fa-play"></i> Start
                    </button>
                    <button class="control-btn reset-btn" data-action="reset" data-timer-id="${timer.id}">
                        <i class="fas fa-redo"></i> Reset
                    </button>
                `;
            case 'running':
                return `
                    <button class="control-btn pause-btn" data-action="pause" data-timer-id="${timer.id}">
                        <i class="fas fa-pause"></i> Pause
                    </button>
                    <button class="control-btn stop-btn" data-action="stop" data-timer-id="${timer.id}">
                        <i class="fas fa-stop"></i> Stop
                    </button>
                `;
            case 'paused':
                return `
                    <button class="control-btn start-btn" data-action="start" data-timer-id="${timer.id}">
                        <i class="fas fa-play"></i> Resume
                    </button>
                    <button class="control-btn stop-btn" data-action="stop" data-timer-id="${timer.id}">
                        <i class="fas fa-stop"></i> Stop
                    </button>
                `;
            case 'completed':
                return `
                    <button class="control-btn reset-btn" data-action="reset" data-timer-id="${timer.id}">
                        <i class="fas fa-redo"></i> Reset
                    </button>
                    <button class="control-btn stop-btn" data-action="stop-alarm" data-timer-id="${timer.id}">
                        <i class="fas fa-volume-mute"></i> Stop Alarm
                    </button>
                `;
            default:
                return '';
        }
    }
    
    getAlarmText(alarmSettings) {
        const soundName = alarmSettings.soundFile.charAt(0).toUpperCase() + alarmSettings.soundFile.slice(1);
        return `${soundName} | ${alarmSettings.volume}%`;
    }
    
    attachTimerCardListeners(timer) {
        const card = document.querySelector(`[data-timer-id="${timer.id}"]`);
        if (!card) return;
        
        // Control buttons
        card.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleTimerAction(btn.dataset.action, timer.id);
            });
        });
    }
    
    handleTimerAction(action, timerId) {
        switch (action) {
            case 'start':
                this.startTimer(timerId);
                break;
            case 'pause':
                this.pauseTimer(timerId);
                break;
            case 'stop':
                this.stopTimer(timerId);
                break;
            case 'reset':
                this.resetTimer(timerId);
                break;
            case 'edit':
                this.openEditModal(timerId);
                break;
            case 'delete':
                this.openDeleteModal(timerId);
                break;
            case 'stop-alarm':
                this.stopAllAlarms();
                break;
        }
    }
    
    updateTimerDisplay(timer) {
        const timeElement = document.getElementById(`time-${timer.id}`);
        const progressElement = document.getElementById(`progress-${timer.id}`);
        
        if (timeElement) {
            timeElement.textContent = this.formatTime(timer.remainingTime);
        }
        
        if (progressElement) {
            progressElement.style.width = `${timer.progress}%`;
        }
    }
    
    updateStats() {
        const stats = this.calculateStats();
        document.getElementById('activeCount').textContent = stats.running;
        document.getElementById('pausedCount').textContent = stats.paused;
        document.getElementById('completedCount').textContent = stats.completed;
    }
    
    calculateStats() {
        return {
            running: this.timers.filter(t => t.status === 'running').length,
            paused: this.timers.filter(t => t.status === 'paused').length,
            stopped: this.timers.filter(t => t.status === 'stopped').length,
            completed: this.timers.filter(t => t.status === 'completed').length
        };
    }
    
    updateFooter() {
        const footerElement = document.getElementById('footerSummary');
        const runningTimers = this.timers.filter(t => t.status === 'running');
        
        if (runningTimers.length === 0) {
            if (this.timers.length === 0) {
                footerElement.textContent = 'Ready to create your first timer';
            } else {
                footerElement.textContent = `Total timers: ${this.timers.length} | No active timers`;
            }
        } else if (runningTimers.length === 1) {
            const timer = runningTimers[0];
            footerElement.textContent = `Running: "${timer.name}" | ${this.formatTime(timer.remainingTime)} remaining`;
        } else {
            const nextToComplete = runningTimers.reduce((min, timer) => 
                timer.remainingTime < min.remainingTime ? timer : min
            );
            footerElement.textContent = `${runningTimers.length} timers running | Next: "${nextToComplete.name}" (${this.formatTime(nextToComplete.remainingTime)})`;
        }
    }
    
    updateSortFilterControls() {
        document.getElementById('sortSelect').value = this.sortCriteria;
        document.getElementById('filterSelect').value = this.filterCriteria;
    }
    
    // ==================== MODAL MANAGEMENT ====================
    
    openCreateModal() {
        this.currentEditingTimer = null;
        document.getElementById('modalTitle').textContent = 'Create New Timer';
        document.getElementById('submitBtn').textContent = 'Create Timer';
        this.resetForm();
        this.showModal('timerModal');
    }
    
    openEditModal(timerId) {
        const timer = this.findTimer(timerId);
        if (!timer) return;
        
        this.currentEditingTimer = timer;
        document.getElementById('modalTitle').textContent = 'Edit Timer';
        document.getElementById('submitBtn').textContent = 'Update Timer';
        this.populateForm(timer);
        this.showModal('timerModal');
    }
    
    openDeleteModal(timerId) {
        const timer = this.findTimer(timerId);
        if (!timer) return;
        
        document.getElementById('deleteTimerName').textContent = timer.name;
        document.getElementById('deleteConfirm').dataset.timerId = timerId;
        this.showModal('deleteModal');
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus management
        const firstInput = modal.querySelector('input, select, textarea, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        document.body.style.overflow = '';
        this.clearValidationErrors();
    }
    
    // ==================== FORM MANAGEMENT ====================
    
    resetForm() {
        document.getElementById('timerForm').reset();
        document.getElementById('volume').value = 50;
        document.getElementById('hours').value = 0;
        document.getElementById('minutes').value = 5;
        document.getElementById('seconds').value = 0;
        this.updateVolumeDisplay();
        this.updateCharCount();
        this.clearValidationErrors();
    }
    
    populateForm(timer) {
        const totalSeconds = timer.originalDuration / 1000;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        document.getElementById('timerName').value = timer.name;
        document.getElementById('hours').value = hours;
        document.getElementById('minutes').value = minutes;
        document.getElementById('seconds').value = seconds;
        document.getElementById('alarmSound').value = timer.alarmSettings.soundFile;
        document.getElementById('volume').value = timer.alarmSettings.volume;
        document.getElementById('repeatAlarm').checked = timer.alarmSettings.repeat;
        document.getElementById('browserNotification').checked = timer.alarmSettings.browserNotification;
        document.getElementById('description').value = timer.description;
        
        this.updateVolumeDisplay();
        this.updateCharCount();
        this.clearValidationErrors();
    }
    
    getFormData() {
        const name = document.getElementById('timerName').value.trim();
        const hours = parseInt(document.getElementById('hours').value);
        const minutes = parseInt(document.getElementById('minutes').value);
        const seconds = parseInt(document.getElementById('seconds').value);
        const duration = this.parseDuration(hours, minutes, seconds);
        
        return {
            name,
            duration,
            alarmSettings: {
                soundFile: document.getElementById('alarmSound').value,
                volume: parseInt(document.getElementById('volume').value),
                repeat: document.getElementById('repeatAlarm').checked,
                repeatInterval: 5, // Fixed at 5 minutes for now
                browserNotification: document.getElementById('browserNotification').checked
            },
            description: document.getElementById('description').value.trim()
        };
    }
    
    validateForm(data) {
        const errors = [];
        
        if (!data.name) {
            errors.push({ field: 'timerName', message: 'Timer name is required' });
        } else if (data.name.length > 50) {
            errors.push({ field: 'timerName', message: 'Timer name must be 50 characters or less' });
        }
        
        if (data.duration <= 0) {
            errors.push({ field: 'duration', message: 'Duration must be greater than 0 seconds' });
        }
        
        if (data.description.length > 200) {
            errors.push({ field: 'description', message: 'Description must be 200 characters or less' });
        }
        
        return errors;
    }
    
    showValidationErrors(errors) {
        this.clearValidationErrors();
        
        errors.forEach(error => {
            const field = document.getElementById(error.field);
            const errorElement = document.getElementById(error.field === 'duration' ? 'durationError' : `${error.field.replace('timer', '').toLowerCase()}Error`);
            
            if (field) {
                field.classList.add('error');
            }
            
            if (errorElement) {
                errorElement.textContent = error.message;
                errorElement.classList.add('show');
            }
        });
    }
    
    clearValidationErrors() {
        document.querySelectorAll('.form-input, .duration-select').forEach(input => {
            input.classList.remove('error');
        });
        
        document.querySelectorAll('.error-message').forEach(error => {
            error.classList.remove('show');
            error.textContent = '';
        });
    }
    
    updateVolumeDisplay() {
        const volumeSlider = document.getElementById('volume');
        const volumeValue = document.querySelector('.volume-value');
        if (volumeSlider && volumeValue) {
            volumeValue.textContent = `${volumeSlider.value}%`;
        }
    }
    
    updateCharCount() {
        const description = document.getElementById('description');
        const charCount = document.querySelector('.char-count');
        if (description && charCount) {
            charCount.textContent = `${description.value.length}/200`;
        }
    }
    
    // ==================== EVENT LISTENERS ====================
    
    setupEventListeners() {
        // Header buttons
        document.getElementById('addTimerBtn').addEventListener('click', () => this.openCreateModal());
        document.getElementById('emptyAddBtn').addEventListener('click', () => this.openCreateModal());
        document.getElementById('searchBtn').addEventListener('click', () => this.toggleSearch());
        
        // Search functionality
        document.getElementById('searchClose').addEventListener('click', () => this.closeSearch());
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.updateSearch(e.target.value);
        });
        
        // Sort and filter controls
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.updateSort(e.target.value);
        });
        
        document.getElementById('filterSelect').addEventListener('change', (e) => {
            this.updateFilter(e.target.value);
        });
        
        // Modal controls
        document.getElementById('modalClose').addEventListener('click', () => this.hideModal('timerModal'));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal('timerModal'));
        
        // Delete modal
        document.getElementById('deleteCancel').addEventListener('click', () => this.hideModal('deleteModal'));
        document.getElementById('deleteConfirm').addEventListener('click', (e) => {
            const timerId = e.target.dataset.timerId;
            this.deleteTimer(timerId);
            this.hideModal('deleteModal');
        });
        
        // Form submission
        document.getElementById('timerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
        
        // Form inputs
        document.getElementById('volume').addEventListener('input', () => this.updateVolumeDisplay());
        document.getElementById('description').addEventListener('input', () => this.updateCharCount());
        
        // Modal overlay clicks
        document.getElementById('timerModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.hideModal('timerModal');
            }
        });
        
        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.hideModal('deleteModal');
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openCreateModal();
            }
            
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                this.toggleSearch();
            }
            
            if (e.key === 'Escape') {
                this.hideModal('timerModal');
                this.hideModal('deleteModal');
                this.closeSearch();
            }
        });
        
        // Page visibility change (pause running timers when tab is hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Optionally pause running timers when tab becomes hidden
                // this.pauseAllRunningTimers();
            }
        });
        
        // Beforeunload warning for running timers
        window.addEventListener('beforeunload', (e) => {
            const runningTimers = this.timers.filter(t => t.status === 'running');
            if (runningTimers.length > 0) {
                e.preventDefault();
                e.returnValue = 'You have running timers. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }
    
    // ==================== SEARCH FUNCTIONALITY ====================
    
    toggleSearch() {
        const searchContainer = document.getElementById('searchContainer');
        const isVisible = searchContainer.classList.contains('active');
        
        if (isVisible) {
            this.closeSearch();
        } else {
            searchContainer.classList.add('active');
            document.getElementById('searchInput').focus();
        }
    }
    
    closeSearch() {
        const searchContainer = document.getElementById('searchContainer');
        const searchInput = document.getElementById('searchInput');
        
        searchContainer.classList.remove('active');
        searchInput.value = '';
        this.updateSearch('');
    }
    
    // ==================== FORM HANDLING ====================
    
    handleFormSubmit() {
        const formData = this.getFormData();
        const errors = this.validateForm(formData);
        
        if (errors.length > 0) {
            this.showValidationErrors(errors);
            return;
        }
        
        if (this.currentEditingTimer) {
            // Update existing timer
            this.updateTimer(this.currentEditingTimer.id, formData);
        } else {
            // Create new timer
            this.createTimer(formData);
        }
        
        this.hideModal('timerModal');
    }
    
    // ==================== TOAST NOTIFICATIONS ====================
    
    showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        const toastId = 'toast_' + Date.now();
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.innerHTML = `
            <i class="${iconMap[type]} toast-icon"></i>
            <div class="toast-message">${this.escapeHTML(message)}</div>
            <button class="toast-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add close functionality
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.hideToast(toastId);
        });
        
        toastContainer.appendChild(toast);
        
        // Auto-hide after duration
        setTimeout(() => {
            this.hideToast(toastId);
        }, duration);
    }
    
    hideToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    populateDurationSelects() {
        const hoursSelect = document.getElementById('hours');
        const minutesSelect = document.getElementById('minutes');
        const secondsSelect = document.getElementById('seconds');
        
        // Populate hours (0-23)
        for (let i = 0; i <= 23; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i.toString().padStart(2, '0');
            hoursSelect.appendChild(option);
        }
        
        // Populate minutes (0-59)
        for (let i = 0; i <= 59; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i.toString().padStart(2, '0');
            minutesSelect.appendChild(option);
        }
        
        // Populate seconds (0-59)
        for (let i = 0; i <= 59; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i.toString().padStart(2, '0');
            secondsSelect.appendChild(option);
        }
    }
    
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showToast('Browser notifications enabled', 'success');
            } else if (permission === 'denied') {
                this.showToast('Browser notifications blocked. Enable in browser settings for timer alerts.', 'warning', 5000);
            }
        }
    }
    
    // ==================== CLEANUP ====================
    
    destroy() {
        // Clear all intervals
        this.timerIntervals.forEach(interval => clearInterval(interval));
        this.timerIntervals.clear();
        
        // Stop audio
        this.stopAllAlarms();
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    
    // ==================== DEVELOPMENT/DEBUG HELPERS ====================
    
    // For testing purposes - remove in production
    createSampleTimers() {
        if (this.timers.length === 0) {
            const sampleTimers = [
                {
                    name: 'Work Session',
                    duration: 25 * 60 * 1000, // 25 minutes
                    alarmSettings: {
                        soundFile: 'chime',
                        volume: 70,
                        repeat: false,
                        browserNotification: true
                    },
                    description: 'Focus time for project work'
                },
                {
                    name: 'Break Time',
                    duration: 5 * 60 * 1000, // 5 minutes
                    alarmSettings: {
                        soundFile: 'bell',
                        volume: 50,
                        repeat: true,
                        browserNotification: true
                    },
                    description: 'Short break to recharge'
                },
                {
                    name: 'Lunch Break',
                    duration: 30 * 60 * 1000, // 30 minutes
                    alarmSettings: {
                        soundFile: 'melody',
                        volume: 80,
                        repeat: false,
                        browserNotification: true
                    },
                    description: 'Time for a proper meal break'
                }
            ];
            
            sampleTimers.forEach(config => this.createTimer(config));
        }
    }
    
    exportTimers() {
        const data = {
            timers: this.timers,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `timers-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Timers exported successfully', 'success');
    }
    
    async importTimers(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.timers && Array.isArray(data.timers)) {
                this.timers = data.timers.map(timer => ({
                    ...timer,
                    createdAt: new Date(timer.createdAt),
                    lastModified: new Date(timer.lastModified),
                    completedAt: timer.completedAt ? new Date(timer.completedAt) : null
                }));
                
                this.saveToStorage();
                this.updateUI();
                this.showToast(`Imported ${data.timers.length} timers successfully`, 'success');
            } else {
                this.showToast('Invalid timer export file', 'error');
            }
        } catch (error) {
            console.error('Import failed:', error);
            this.showToast('Failed to import timers', 'error');
        }
    }
    
    getStats() {
        return {
            totalTimers: this.timers.length,
            completedTimers: this.timers.filter(t => t.status === 'completed').length,
            totalTimeSpent: this.timers
                .filter(t => t.status === 'completed')
                .reduce((total, timer) => total + timer.originalDuration, 0),
            averageTimerDuration: this.timers.length > 0 
                ? this.timers.reduce((total, timer) => total + timer.originalDuration, 0) / this.timers.length 
                : 0
        };
    }
}

// ==================== CSS ANIMATIONS ====================

// Add CSS for slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==================== INITIALIZATION ====================

// Initialize the timer manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.timerManager = new TimerManager();
    
    // Add development helpers to window for debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.createSampleTimers = () => window.timerManager.createSampleTimers();
        window.exportTimers = () => window.timerManager.exportTimers();
        window.clearAll = () => window.timerManager.clearStorage();
        window.getStats = () => console.table(window.timerManager.getStats());
        
        console.log('Multi-Timer App loaded in development mode');
        console.log('Available commands:');
        console.log('- createSampleTimers() - Add sample timers');
        console.log('- exportTimers() - Export current timers');
        console.log('- clearAll() - Clear all timer data');
        console.log('- getStats() - Show usage statistics');
    }
});

// ==================== SERVICE WORKER REGISTRATION (Optional) ====================

// Register service worker for offline functionality and notifications
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}

// ==================== PWA INSTALLATION (Optional Enhancement) ====================

// Handle PWA installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button or banner
    const installBtn = document.createElement('button');
    installBtn.textContent = 'Install Timer App';
    installBtn.className = 'btn btn-primary install-btn';
    installBtn.style.margin = '10px';
    
    installBtn.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
            }
            deferredPrompt = null;
            installBtn.remove();
        });
    });
    
    document.querySelector('.header-right').appendChild(installBtn);
});