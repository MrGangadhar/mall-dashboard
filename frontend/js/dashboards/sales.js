// Sales Dashboard
class SalesDashboard {
    constructor() {
        this.api = new API();
        this.charts = {};
        this.init();
    }

    async init() {
        await this.loadSalesData();
        this.setupEventListeners();
    }

    async loadSalesData() {
        try {
            const data = await this.api.getSalesData();
            this.updateStats(data);
            this.updateCharts(data);
            this.updateTable(data);
        } catch (error) {
            Utils.showNotification('Error loading sales data', 'danger');
        }
    }

    updateStats(data) {
        // Calculate totals
        const totalSales = data.reduce((sum, item) => sum + (item.total_sales || 0), 0);
        const totalTransactions = data.reduce((sum, item) => sum + (item.transaction_count || 0), 0);
        const avgTicket = totalTransactions ? totalSales / totalTransactions : 0;

        document.getElementById('totalSales').textContent = Utils.formatCurrency(totalSales);
        document.getElementById('totalTransactions').textContent = Utils.formatNumber(totalTransactions);
        document.getElementById('avgTicket').textContent = Utils.formatCurrency(avgTicket);
    }

    updateCharts(data) {
        // Group by date for trend chart
        const grouped = {};
        data.forEach(item => {
            const date = item.date;
            if (!grouped[date]) grouped[date] = 0;
            grouped[date] += item.total_sales || 0;
        });

        const labels = Object.keys(grouped).sort();
        const values = labels.map(d => grouped[d]);

        const ctx = document.getElementById('salesTrendChart');
        if (ctx) {
            if (this.charts.trend) this.charts.trend.destroy();
            this.charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels.map(d => Utils.formatDate(d)),
                    datasets: [{
                        label: 'Sales',
                        data: values,
                        borderColor: '#4e73df',
                        backgroundColor: 'rgba(78,115,223,0.05)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (ctx) => Utils.formatCurrency(ctx.raw)
                            }
                        }
                    }
                }
            });
        }
    }

    updateTable(data) {
        const tbody = document.querySelector('#salesTable tbody');
        if (!tbody) return;

        tbody.innerHTML = data.slice(0, 10).map(item => `
            <tr>
                <td>${Utils.formatDate(item.date)}</td>
                <td>${item.mall_name || 'N/A'}</td>
                <td>${item.brand_name || 'N/A'}</td>
                <td class="text-end">${Utils.formatCurrency(item.total_sales)}</td>
                <td class="text-end">${Utils.formatNumber(item.transaction_count)}</td>
            </tr>
        `).join('');
    }

    setupEventListeners() {
        document.getElementById('refreshSalesBtn')?.addEventListener('click', () => this.loadSalesData());
    }
}

// Initialize on page load
if (document.getElementById('salesDashboard')) {
    window.salesDashboard = new SalesDashboard();
}