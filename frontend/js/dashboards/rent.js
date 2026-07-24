class RentDashboard {
    constructor() {
        this.api = new API();
        this.init();
    }

    async init() {
        await this.loadData();
    }

    async loadData() {
        try {
            const data = await this.api.request('/rent-data');
            this.updateStats(data);
        } catch (error) {
            Utils.showNotification('Error loading rent data', 'danger');
        }
    }

    updateStats(data) {
        const total = data.reduce((sum, item) => sum + item.total_rent, 0);
        const pending = data.filter(item => item.payment_status === 'Pending').length;
        
        document.getElementById('totalRent').textContent = Utils.formatCurrency(total);
        document.getElementById('pendingRent').textContent = pending;
    }
}