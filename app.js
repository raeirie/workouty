/**
 * WORKOUT TRACKER CORE APPLICATION - VERSION 2.1.1
 * FITUR: FIX MOBILE SCROLL OVERFLOW & SYNC BOTTOM NAV TAB STATE CASE-SENSITIVITY
 */

const State = {
    currentUser: localStorage.getItem('activeUser') || null,
    currentTab: 'home',
    historyData: [],
    currentViewDate: new Date()
};

const DOM = {
    loginOverlay: document.getElementById('login-overlay'),
    userWelcome: document.getElementById('user-welcome'),
    todayStringDate: document.getElementById('today-string-date'),
    todayStatusAlert: document.getElementById('today-status-alert'),
    appVersion: document.getElementById('app-version'),
    toast: document.getElementById('toast'),
    
    viewHome: document.getElementById('view-home'),
    viewProgress: document.getElementById('view-progress'),
    navHome: document.getElementById('nav-home'),
    navProgress: document.getElementById('nav-progress'), // Perbaikan Kapitalisasi Sinkronisasi (navProgress)
    
    fabBtn: document.getElementById('fab-checkin-btn'),
    sheetBackdrop: document.getElementById('sheet-backdrop'),
    bottomSheet: document.getElementById('workout-bottom-sheet'),
    inputDate: document.getElementById('input-date'),
    inputTime: document.getElementById('input-time'),
    inputDuration: document.getElementById('input-duration'),

    mStreak: document.getElementById('m-streak'),
    mCount: document.getElementById('m-count'),
    mDuration: document.getElementById('m-duration'),
    mAvg: document.getElementById('m-avg'),
    
    calendarTitle: document.getElementById('calendar-title'),
    calendarGrid: document.getElementById('calendar-grid'),
    prevMonthBtn: document.getElementById('prev-month'),
    nextMonthBtn: document.getElementById('next-month')
};

const App = {
    init() {
        this.setupDateDisplay();
        this.setupEventListeners();
        
        if (State.currentUser === null || State.currentUser === undefined || State.currentUser === "null") {
            localStorage.removeItem('activeUser');
            State.currentUser = null;
            DOM.loginOverlay.classList.remove('hidden');
            DOM.loginOverlay.style.display = "flex";
        } else {
            DOM.loginOverlay.classList.add('hidden');
            DOM.loginOverlay.style.display = "none";
            this.syncAppLaunch();
        }
    },

    setupDateDisplay() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        DOM.todayStringDate.innerText = new Date().toLocaleDateString('id-ID', options);
        DOM.appVersion.innerText = `v${APP_CONFIG.VERSION} [${APP_CONFIG.ENV}]`;
    },

    setupEventListeners() {
        DOM.fabBtn.addEventListener('click', () => this.openBottomSheet());
        DOM.prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        DOM.nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        
        if (DOM.navHome) DOM.navHome.addEventListener('click', () => this.switchTab('home'));
        if (DOM.navProgress) DOM.navProgress.addEventListener('click', () => this.switchTab('progress'));
    },

    showToast(message, isError = false) {
        DOM.toast.innerText = message;
        DOM.toast.style.background = isError ? "#da3637" : "var(--green-active)";
        DOM.toast.classList.add('show');
        setTimeout(() => DOM.toast.classList.remove('show'), 3000);
    },

    handleLogin(user) {
        if (!user) return;
        State.currentUser = user;
        localStorage.setItem('activeUser', user);
        DOM.loginOverlay.style.opacity = '0';
        setTimeout(() => {
            DOM.loginOverlay.classList.add('hidden');
            DOM.loginOverlay.style.display = "none";
            this.syncAppLaunch();
        }, 300);
    },

    handleLogout() {
        localStorage.clear();
        State.currentUser = null;
        location.reload();
    },

    syncAppLaunch() {
        DOM.userWelcome.innerText = `Halo, ${State.currentUser}!`;
        this.loadDashboardData();
    },

    switchTab(tabName) {
        if (State.currentTab === tabName) return;
        State.currentTab = tabName;
        
        if (tabName === 'home') {
            DOM.viewHome.classList.add('active-view');
            DOM.viewProgress.classList.remove('active-view');
            DOM.navHome.classList.add('active-nav');
            if (DOM.navProgress) DOM.navProgress.classList.remove('active-nav');
        } else {
            DOM.viewHome.classList.remove('active-view');
            DOM.viewProgress.classList.add('active-view');
            DOM.navHome.classList.remove('active-nav');
            if (DOM.navProgress) DOM.navProgress.classList.add('active-nav');
        }
    },

    openBottomSheet() {
        const todayStr = ApiService.getLocalDateString();
        DOM.inputDate.value = todayStr;
        DOM.inputDate.max = todayStr;
        
        const now = new Date();
        DOM.inputTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        DOM.sheetBackdrop.classList.add('open');
        DOM.bottomSheet.classList.add('open');
    },

    closeBottomSheet() {
        DOM.sheetBackdrop.classList.remove('open');
        DOM.bottomSheet.classList.remove('open');
    },

    changeMonth(direction) {
        State.currentViewDate.setMonth(State.currentViewDate.getMonth() + direction);
        this.renderCalendar();
    },

    async loadDashboardData() {
        try {
            State.historyData = await ApiService.fetchHistory();
            this.calculateAdvancedMetrics();
            this.renderCalendar();
        } catch (err) {
            console.error("Error global loadDashboardData:", err);
            this.showToast("Gagal memuat histori data.", true);
        }
    },

    calculateAdvancedMetrics() {
        const targetMonth = new Date().getMonth();
        const targetYear = new Date().getFullYear();

        const cleanHistory = State.historyData.filter(entry => entry && entry.userName && entry.workoutDate);

        const monthlyData = cleanHistory.filter(entry => {
            const d = new Date(entry.workoutDate);
            return entry.userName === State.currentUser && 
                   d.getMonth() === targetMonth && 
                   d.getFullYear() === targetYear;
        });

        const sessionCount = monthlyData.length;
        const totalMins = monthlyData.reduce((sum, entry) => sum + (parseInt(entry.duration, 10) || 0), 0);
        
        DOM.mCount.innerText = `${sessionCount} Sesi`;
        DOM.mDuration.innerText = `${totalMins} mnt`;

        const avgMins = sessionCount > 0 ? Math.round(totalMins / sessionCount) : 0;
        DOM.mAvg.innerText = `${avgMins} mnt`;

        const allCheckedDates = [...new Set(cleanHistory
            .filter(entry => entry.userName === State.currentUser)
            .map(entry => {
                const d = new Date(entry.workoutDate);
                return isNaN(d.getTime()) ? null : d.toLocaleDateString('sv-SE');
            }))]
            .filter(dateStr => dateStr !== null)
            .sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        let todayStr = ApiService.getLocalDateString();
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        let yesterdayStr = yesterday.toLocaleDateString('sv-SE');

        if (allCheckedDates.includes(todayStr) || allCheckedDates.includes(yesterdayStr)) {
            let currentCheckDate = allCheckedDates.includes(todayStr) ? new Date(todayStr) : new Date(yesterdayStr);
            while (true) {
                const currentStr = currentCheckDate.toLocaleDateString('sv-SE');
                if (allCheckedDates.includes(currentStr)) {
                    streak++;
                    currentCheckDate.setDate(currentCheckDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }
        DOM.mStreak.innerText = `🔥 ${streak} Hari`;

        const checkedToday = allCheckedDates.includes(todayStr);
        if (checkedToday) {
            DOM.fabBtn.disabled = true;
            DOM.todayStatusAlert.innerText = "Sesi hari ini selesai! Istirahat yang cukup. 🙌🏼";
            DOM.todayStatusAlert.style.borderColor = "var(--green-active)";
            DOM.todayStatusAlert.style.color = "var(--green-today)";
        } else {
            DOM.fabBtn.disabled = false;
            DOM.todayStatusAlert.innerText = "Anda belum berolahraga hari ini. Ketuk tombol + di bawah!";
            DOM.todayStatusAlert.style.borderColor = "var(--border-color)";
            DOM.todayStatusAlert.style.color = "var(--text-muted)";
        }
    },

    renderCalendar() {
        DOM.calendarGrid.innerHTML = "";
        const monthsInIndonesian = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        
        const year = State.currentViewDate.getFullYear();
        const month = State.currentViewDate.getMonth();
        DOM.calendarTitle.innerText = `${monthsInIndonesian[month]} ${year}`;
        
        const realToday = new Date();
        if (year >= realToday.getFullYear() && month >= realToday.getMonth()) {
            DOM.nextMonthBtn.disabled = true;
        } else {
            DOM.nextMonthBtn.disabled = false;
        }

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const isCurrentMonthView = realToday.getMonth() === month && realToday.getFullYear() === year;
        const todayDateNum = realToday.getDate();

        const checkedDays = State.historyData
            .filter(entry => {
                if(!entry || !entry.workoutDate) return false;
                const d = new Date(entry.workoutDate);
                return entry.userName === State.currentUser && d.getMonth() === month && d.getFullYear() === year;
            })
            .map(entry => new Date(entry.workoutDate).getDate());

        for (let i = 1; i <= daysInMonth; i++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.innerText = i;
            
            if (isCurrentMonthView && i === todayDateNum) {
                square.classList.add('today');
            }
            if (checkedDays.includes(i)) {
                square.classList.add('active');
            }
            DOM.calendarGrid.appendChild(square);
        }
    },

    async handleCheckIn() {
        const dateVal = DOM.inputDate.value;
        const timeVal = DOM.inputTime.value;
        const durationVal = DOM.inputDuration.value;

        if(!dateVal) {
            this.showToast("Tanggal wajib diisi!", true);
            return;
        }

        DOM.bottomSheet.innerHTML = `<div style="text-align:center; padding: 40px 0;"><p style="color:white; font-weight:600;">Menyimpan...</p></div>`;
        
        try {
            await ApiService.checkIn(State.currentUser, dateVal, timeVal, durationVal);
            this.showToast(`Sukses mencatat olahraga Anda!`);
            setTimeout(() => location.reload(), 1200);
        } catch (err) {
            this.showToast('Gagal terhubung ke server.', true);
            console.error(err);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());