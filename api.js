const ApiService = {
    /**
     * Mendapatkan tanggal lokal perangkat dengan format YYYY-MM-DD
     */
    getLocalDateString() {
        return new Date().toLocaleDateString('sv-SE');
    },

    /**
     * Mengirim data check-in terperinci ke backend
     */
    async checkIn(userName, workoutDate, workoutTime, duration) {
        const payload = {
            userName: userName,
            workoutDate: workoutDate,
            workoutTime: workoutTime || "",
            duration: duration ? parseInt(duration, 10) : ""
        };

        const response = await fetch(APP_CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors', // Menghindari kendala CORS pada redirect Apps Script
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response;
    },

    /**
     * Mengambil riwayat data dari Google Sheets
     */
    async fetchHistory() {
        try {
            const response = await fetch(APP_CONFIG.API_URL);
            if (!response.ok) throw new Error("Gagal mengambil data dari server.");
            return await response.json();
        } catch (error) {
            console.error("ApiService.fetchHistory bermasalah:", error);
            throw error;
        }
    }
};