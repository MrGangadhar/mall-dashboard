class RentDashboard {
    constructor() {
        this.api = new API();
        this.charts = {};
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
    }

    async loadData() {
        try {
            const data = await this.api.getRentData();
            this.updateStats(data);
            this.updateChart(data);
            this.updateTable(data);
        } catch (error) {
            console.error('Error loading rent data:', error);
            Utils.showNotification('Error loading rent data', 'danger');
        }
    }

    updateStats(data) {
        if (!data || !Array.isArray(data)) return;

        const total = data.reduce((sum, item) => sum + (parseFloat(item.total_rent) || 0), 0);
        const pending = data.filter(item => item.payment_status === 'Pending' || item.payment_status === 'Overdue').length;
        const paid = data.filter(item => item.payment_status === 'Paid').length;
        const rate = data.length > 0 ? ((paid / data.length) * 100).toFixed(1) : 0;

        const totalEl = document.getElementById('totalRent');
        const pendingEl = document.getElementById('pendingRent');
        const rateEl = document.getElementById('collectionRateRent');

        if (totalEl) totalEl.textContent = Utils.formatCurrency(total);
        if (pendingEl) pendingEl.textContent = pending;
        if (rateEl) rateEl.textContent = rate + '%';
    }

    updateChart(data) {
        if (!data || !Array.isArray(data)) return;

        const ctx = document.getElementById('rentStatusChart');
        if (!ctx) return;

        const paid = data.filter(d => d.payment_status === 'Paid').length;
        const pending = data.filter(d => d.payment_status === 'Pending').length;
        const overdue = data.filter(d => d.payment_status === 'Overdue').length;
        const partial = data.filter(d => d.payment_status === 'Partial').length;

        if (this.charts.status) this.charts.status.destroy();
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Pending', 'Overdue', 'Partial'],
                datasets: [{
                    data: [paid, pending, overdue, partial],
                    backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b', '#36b9cc'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { family: "'Inter', 'Rubik', sans-serif", size: 12 } }
                    }
                }
            }
        });
    }

    updateTable(data) {
        const tbody = document.querySelector('#rentTable tbody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-3 d-block"></i>No rent data available</td></tr>';
            return;
        }

        tbody.innerHTML = data.slice(0, 15).map(item => {
            const statusColor = item.payment_status === 'Paid' ? 'success' : item.payment_status === 'Overdue' ? 'danger' : 'warning';
            return `
                <tr>
                    <td>${item.month || 'N/A'}</td>
                    <td>${item.mall_name || 'N/A'}</td>
                    <td>${item.brand_name || 'N/A'}</td>
                    <td class="text-end">${Utils.formatCurrency(item.total_rent)}</td>
                    <td><span class="badge bg-${statusColor}">${item.payment_status || 'N/A'}</span></td>
                </tr>
            `;
        }).join('');
    }

    setupEventListeners() {
        document.getElementById('refreshRentBtn')?.addEventListener('click', () => this.loadData());
    }
}

// Initialize on page load
if (document.getElementById('rentDashboard')) {
    window.rentDashboard = new RentDashboard();
}