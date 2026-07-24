// Walk-in Dashboard
class WalkinDashboard {
    constructor() {
        this.api = new API();
        this.charts = {};
        this.init();
    }

    async init() {
        await this.loadWalkinData();
        this.setupEventListeners();
    }

    async loadWalkinData() {
        try {
            const data = await this.api.request('/walkin-data');
            this.updateStats(data);
            this.updateCharts(data);
            this.updateTable(data);
        } catch (error) {
            Utils.showNotification('Error loading walk-in data', 'danger');
        }
    }

    updateStats(data) {
        const totalFootfall = data.reduce((sum, item) => sum + (item.footfall || 0), 0);
        const avgDwell = data.reduce((sum, item) => sum + (item.average_dwell_time || 0), 0) / (data.length || 1);
        
        document.getElementById('totalFootfall').textContent = Utils.formatNumber(totalFootfall);
        document.getElementById('avgDwell').textContent = Math.round(avgDwell) + ' min';
        document.getElementById('totalDays').textContent = data.length;
    }

    updateCharts(data) {
        const ctx = document.getElementById('walkinChart');
        if (!ctx) return;

        const dates = data.map(d => Utils.formatDate(d.date)).slice(-7);
        const footfall = data.map(d => d.footfall || 0).slice(-7);

        if (this.charts.main) this.charts.main.destroy();
        this.charts.main = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Footfall',
                    data: footfall,
                    backgroundColor: '#1cc88a'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    updateTable(data) {
        const tbody = document.querySelector('#walkinTable tbody');
        if (!tbody) return;

        tbody.innerHTML = data.slice(0, 10).map(item => `
            <tr>
                <td>${Utils.formatDate(item.date)}</td>
                <td>${item.mall_name || 'N/A'}</td>
                <td class="text-end">${Utils.formatNumber(item.footfall)}</td>
                <td class="text-end">${item.peak_hour_visitors || 0}</td>
                <td class="text-end">${item.average_dwell_time || 0} min</td>
            </tr>
        `).join('');
    }

    setupEventListeners() {
        document.getElementById('refreshWalkinBtn')?.addEventListener('click', () => this.loadWalkinData());
    }
}

// Initialize on page load
if (document.getElementById('walkinDashboard')) {
    window.walkinDashboard = new WalkinDashboard();
}