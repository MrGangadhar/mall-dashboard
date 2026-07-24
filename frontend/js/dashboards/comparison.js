class ComparisonDashboard {
    constructor() {
        this.api = new API();
        this.init();
    }

    async init() {
        await this.loadData();
    }

    async loadData() {
        try {
            const malls = await this.api.getMalls();
            this.populateMallSelect(malls);
        } catch (error) {
            Utils.showNotification('Error loading comparison data', 'danger');
        }
    }

    populateMallSelect(malls) {
        const select = document.getElementById('compareMallSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">All Malls</option>';
        malls.forEach(mall => {
            select.innerHTML += `<option value="${mall.id}">${mall.name</option>`;
        });
    }

    async compare() {
        const month1 = document.getElementById('month1').value;
        const month2 = document.getElementById('month2').value;
        
        if (!month1 || !month2) {
            Utils.showNotification('Please select both months', 'warning');
            return;
        }

        try {
            const data = await this.api.request(`/compare?month1=${month1}&month2=${month2}`);
            this.updateChart(data);
        } catch (error) {
            Utils.showNotification('Error comparing data', 'danger');
        }
    }

    updateChart(data) {
        const ctx = document.getElementById('comparisonChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Month 1', 'Month 2'],
                datasets: [{
                    label: 'Sales',
                    data: [data.month1, data.month2],
                    backgroundColor: ['#4e73df', '#1cc88a']
                }]
            }
        });
    }
}