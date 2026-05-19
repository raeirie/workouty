const State = {
    currentUser: localStorage.getItem('activeUser') || 'Suami',
    historyData: [],
    currentViewDate: new Date() // Menyimpan konteks bulan yang sedang dilihat
};

const DOM = {
    actionZone: document.getElementById('action-zone'),
    questionZone: document.getElementById('question-zone'),
    checkinBtn: document.getElementById('checkin-btn'),
    submitBtn: document.getElementById('submit-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
    
    // Form Inputs
    inputDate: document.getElementById('input-date'),
    inputTime: document.getElementById('input-time'),
    inputDuration: document.getElementById('input-duration'),
    
    // Analytics & Navigation
    streakMetric: document.getElementById('streak-metric'),
    durationMetric: document.getElementById('duration-metric'),
    calendarTitle: document.getElementById('calendar-title'),
    calendarGrid: document.getElementById('calendar-grid'),
    prevMonthBtn: document.getElementById('prev-month'),
    nextMonthBtn: document.getElementById('next-month'),
    
    // System
    appVersion: document.getElementById('app-version'),
    userButtons: document.querySelectorAll('.user-btn'),
    toast: document.getElementById('toast')
};

const App = {
    init() {
        this.setupEventListeners();
        this.syncUserUI();
        this.loadDashboard();
    },

    showToast(message, isError = false) {
        DOM.toast.innerText = message;
        DOM.toast.style.background = isError ? "#da3637" : "#238636";
        DOM.toast.classList.add('show');
        setTimeout(() => DOM.toast.classList.remove('show'), 3000);
    },

    setupEventListeners() {
        DOM.checkinBtn.addEventListener('click', () => {
            // Set default tanggal form ke hari ini & batasi tanggal maksimal
            const todayStr = ApiService.getLocalDateString();
            DOM.inputDate.value = todayStr;
            DOM.inputDate.max = todayStr;
            
            DOM.actionZone.classList.add('hidden');
            DOM.questionZone.classList.remove('hidden');
        });

        DOM.cancelBtn.addEventListener('click', () => {
            DOM.questionZone.classList.add('hidden');
            DOM.actionZone.classList.remove('hidden');
        });

        DOM.submitBtn.addEventListener('click', () => {
            this.handleCheckIn();
        });

        DOM.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        DOM.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
    },

    syncUserUI() {
        DOM.userButtons.forEach(btn => {
            if (btn.getAttribute('data-user') === State.currentUser) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        DOM.appVersion.innerText = `v${APP_CONFIG.VERSION} [${APP_CONFIG.ENV}]`;
    },

    switchUser(targetUser) {
        if (State.currentUser === targetUser) return;
        State.currentUser = targetUser;
        localStorage.setItem('activeUser', targetUser);
        this.syncUserUI();
        this.calculateMetrics();
        this.renderGrid();
    },

    changeMonth(direction) {
        State.currentViewDate.setMonth(State.currentViewDate.getMonth() + direction);
        this.calculateMetrics();
        this.renderGrid();
    },

    async handleCheckIn() {
        const dateVal = DOM.inputDate.value;
        const timeVal = DOM.inputTime.value;
        const durationVal = DOM.inputDuration.value;

        if(!dateVal) {
            this.showToast("Tanggal wajib diisi!", true);
            return;
        }

        DOM.questionZone.innerHTML = `<p style="color:#8b949e; font-style:italic;">Menyimpan data laporan...</p>`;
        
        try {
            await ApiService.checkIn(State.currentUser, dateVal, timeVal, durationVal);
            this.showToast(`Berhasil check-in untuk ${State.currentUser}!`);
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            this.showToast('Gagal terhubung ke database.', true);
            console.error(err);
        }
    },

    async loadDashboard() {
        DOM.calendarGrid.innerHTML = `<div style="grid-column: span 7; color: #666; font-size:14px; padding:20px 0;">Memuat grafik...</div>`;
        
        try {
            State.historyData = await ApiService.fetchHistory();
            this.calculateMetrics();
            this.renderGrid();
        } catch (err) {
            DOM.calendarGrid.innerHTML = `<div style="grid-column: span 7; color: #da3637; font-size:12px;">Gagal memuat histori latihan.</div>`;
        }
    },

    calculateMetrics() {
        const targetMonth = State.currentViewDate.getMonth();
        const targetYear = State.currentViewDate.getFullYear();

        // 1. Hitung Total Durasi Bulan Berjalan
        const totalMins = State.historyData
            .filter(entry => {
                const d = new Date(entry.workoutDate);
                return entry.userName === State.currentUser && 
                       d.getMonth() === targetMonth && 
                       d.getFullYear() === targetYear;
            })
            .reduce((sum, entry) => sum + (parseInt(entry.duration, 10) || 0), 0);

        DOM.durationMetric.innerText = `${totalMins} mnt`;

        // 2. Hitung Streak Berjalan (Akurasi Tinggi Berdasarkan Urutan Tanggal)
        const allCheckedDates = [...new Set(State.historyData
            .filter(entry => entry.userName === State.currentUser)
            .map(entry => entry.workoutDate.split('T')[0]))]
            .sort((a, b) => new Date(b) - new Date(a)); // Urutkan dari yang terbaru

        let streak = 0;
        let todayStr = ApiService.getLocalDateString();
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        let yesterdayStr = yesterday.toLocaleDateString('sv-SE');

        // Streak aktif jika ada check-in hari ini atau kemarin
        if (allCheckedDates.includes(todayStr) || allCheckedDates.includes(yesterdayStr)) {
            let currentCheckDate = allCheckedDates.includes(todayStr) ? new Date(todayStr) : new Date(yesterdayStr);
            
            while (true) {
                const currentStr = currentCheckDate.toLocaleDateString('sv-SE');
                if (allCheckedDates.includes(currentStr)) {
                    streak++;
                    currentCheckDate.setDate(currentCheckDate.getDate() - 1); // Mundur 1 hari
                } else {
                    break;
                }
            }
        }
        DOM.streakMetric.innerText = `🔥 ${streak} Hari`;

        // 3. Validasi Apakah Sudah Check-In Hari Ini
        const checkedToday = allCheckedDates.includes(todayStr);
        if (checkedToday) {
            DOM.checkinBtn.disabled = true;
            DOM.checkinBtn.innerText = "Sudah Check In Hari Ini ✓";
            DOM.checkinBtn.style.background = "#30363d";
            DOM.checkinBtn.style.color = "#8b949e";
            DOM.checkinBtn.style.cursor = "not-allowed";
        }
    },

    renderGrid() {
        DOM.calendarGrid.innerHTML = "";
        
        const monthsInIndonesian = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
            "Juli", "Agustus", "September", "Oktobers", "November", "Desember"
        ];
        
        const year = State.currentViewDate.getFullYear();
        const month = State.currentViewDate.getMonth();
        
        DOM.calendarTitle.innerText = `${monthsInIndonesian[month]} ${year}`;
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayLocal = new Date();
        const todayDateNum = todayLocal.getDate();
        const isCurrentMonthView = todayLocal.getMonth() === month && todayLocal.getFullYear() === year;

        // Ambil list tanggal latihan user pada bulan yang sedang dilihat
        const checkedDays = State.historyData
            .filter(entry => {
                const d = new Date(entry.workoutDate);
                return entry.userName === State.currentUser && 
                       d.getMonth() === month && 
                       d.getFullYear() === year;
            })
            .map(entry => new Date(entry.workoutDate).getDate());

        for (let i = 1; i <= daysInMonth; i++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.innerText = i;
            
            // Highlight jika hari ini
            if (isCurrentMonthView && i === todayDateNum) {
                square.classList.add('today');
            }
            
            // Highlight jika sudah checked-in
            if (checkedDays.includes(i)) {
                square.classList.add('active');
            }
            DOM.calendarGrid.appendChild(square);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());