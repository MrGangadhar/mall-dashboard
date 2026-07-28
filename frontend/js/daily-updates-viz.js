// Daily Updates Visualization Module
class DailyUpdatesVisualization {
    constructor() {
        this.api = new API();
        this.charts = {};
        this.currentData = null;
        this.allData = null; // Store all data for filtering
        this.init();
    }

    async init() {
        // Check authentication
        if (!auth.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Load user info
        this.loadUserInfo();

        // Load main malls dropdown
        await this.loadMalls();

        // Load histogram malls dropdown
        await this.loadHistogramMalls();

        // Set default date range for histogram
        this.setDefaultDateRange();

        // Load initial data
        await this.loadVisualization();

        // Load total metrics (across all malls)
        await this.updateTotalMetrics();

        // Load histogram
        await this.loadHistogram();

        // Setup event listeners
        this.setupEventListeners();
    }

    loadUserInfo() {
        const user = auth.getUser();
        if (user) {
            document.getElementById('userFullName').textContent = `Welcome, ${user.full_name || user.username}`;
            document.getElementById('userRole').textContent = user.role || 'Administrator';

            const initials = (user.full_name || user.username).split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            document.getElementById('userInitials').textContent = initials;

            // Sidebar user info if exists
            const sidebarUserName = document.getElementById('sidebarUserName');
            const sidebarUserRole = document.getElementById('sidebarUserRole');
            const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');

            if (sidebarUserName) sidebarUserName.textContent = user.full_name || user.username;
            if (sidebarUserRole) sidebarUserRole.textContent = user.role || 'Administrator';
            if (sidebarUserAvatar) {
                sidebarUserAvatar.textContent = initials;
            }
        }
    }

    async loadMalls() {
        try {
            const malls = await this.api.getMalls();
            const select = document.getElementById('mallFilter');

            if (!select) return;

            select.innerHTML = '<option value="">All Malls</option>';

            if (malls && malls.length > 0) {
                malls.forEach(mall => {
                    const option = document.createElement('option');
                    option.value = mall.id;
                    option.textContent = mall.name;
                    select.appendChild(option);
                });
            }

            // Initialize select2 if available
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $('#mallFilter').select2({
                    placeholder: 'Select Mall',
                    width: '100%'
                });
            }

        } catch (error) {
            console.error('Error loading malls:', error);
            this.showNotification('Failed to load malls', 'danger');
        }
    }

    // ==================== HISTOGRAM MALLS METHODS ====================

    async loadHistogramMalls() {
        try {
            const malls = await this.api.getMalls();
            const select = document.getElementById('histogramMallFilter');

            if (!select) return;

            select.innerHTML = '<option value="">All Malls</option>';

            if (malls && malls.length > 0) {
                malls.forEach(mall => {
                    const option = document.createElement('option');
                    option.value = mall.id;
                    option.textContent = mall.name;
                    select.appendChild(option);
                });
            }

            // Initialize select2 if available
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $('#histogramMallFilter').select2({
                    placeholder: 'Select Mall for Histogram',
                    width: '100%'
                });
            }

        } catch (error) {
            console.error('Error loading histogram malls:', error);
        }
    }

    setupEventListeners() {
        const periodFilter = document.getElementById('periodFilter');
        const chartTypeFilter = document.getElementById('chartTypeFilter');
        const mallFilter = document.getElementById('mallFilter');
        const histogramMallFilter = document.getElementById('histogramMallFilter');
        const histogramStartDate = document.getElementById('histogramStartDate');
        const histogramEndDate = document.getElementById('histogramEndDate');
        const histogramMetricSelect = document.getElementById('histogramMetricSelect');
        const exportBtn = document.getElementById('exportDataBtn');
        const printBtn = document.getElementById('printDataBtn');
        const applyDateRange = document.getElementById('applyDateRange');

        if (periodFilter) {
            periodFilter.addEventListener('change', () => {
                this.loadVisualization();
                this.updateTotalMetrics();
                this.loadHistogram();
            });
        }

        if (chartTypeFilter) {
            chartTypeFilter.addEventListener('change', () => this.updateChartType());
        }

        if (mallFilter) {
            mallFilter.addEventListener('change', () => {
                this.loadVisualization();
                this.loadDetailedData();
            });
        }

        // Histogram specific listeners
        if (histogramMallFilter) {
            histogramMallFilter.addEventListener('change', () => this.loadHistogram());
        }

        if (histogramStartDate) {
            histogramStartDate.addEventListener('change', () => {
                if (histogramEndDate?.value) {
                    this.loadHistogram();
                }
            });
        }
        if (histogramEndDate) {
            histogramEndDate.addEventListener('change', () => {
                if (histogramStartDate?.value) {
                    this.loadHistogram();
                }
            });
        }
        if (histogramMetricSelect) {
            histogramMetricSelect.addEventListener('change', () => this.loadHistogram());
        }

        // Export and print buttons
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printData());
        }

        // Apply date range for detailed data
        if (applyDateRange) {
            applyDateRange.addEventListener('click', () => this.loadDetailedData());
        }
    }

    async loadVisualization() {
        this.showLoading(true);

        try {
            const mallId = document.getElementById('mallFilter')?.value || '';
            const period = document.getElementById('periodFilter')?.value || 'daily';

            // Fetch comparison data using API helper
            this.currentData = await this.api.getDailyUpdatesComparison({
                mall_id: mallId,
                period: period
            });

            // Update metrics (now with day-over-day comparison)
            this.updateMetrics();
            await this.updateSummaryCards(mallId);

            // Update performance table with real data
            await this.updatePerformanceTable();

            // Update charts (default to bar chart)
            this.updateMainChart();
            this.updateVehicleChart();
            this.updateUtilityChart();

            // Load detailed data
            await this.loadDetailedData();

        } catch (error) {
            console.error('Error loading visualization:', error);
            this.showNotification('Failed to load data', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    updateMetrics() {
        if (!this.currentData || !Array.isArray(this.currentData.mall_footfall) || this.currentData.mall_footfall.length === 0) return;

        const footfall = this.currentData.mall_footfall.map(v => Number(v) || 0);
        const cinema = this.currentData.cinema_walkin.map(v => Number(v) || 0);
        const parking = this.currentData.parking_collection.map(v => Number(v) || 0);

        // Calculate averages
        const avgFootfall = footfall.reduce((a, b) => a + b, 0) / footfall.length || 0;
        const avgCinema = cinema.reduce((a, b) => a + b, 0) / cinema.length || 0;
        const avgParking = parking.reduce((a, b) => a + b, 0) / parking.length || 0;

        const avgFootfallEl = document.getElementById('avgFootfall');
        const avgCinemaEl = document.getElementById('avgCinema');
        const avgParkingEl = document.getElementById('avgParking');
        const totalUpdatesEl = document.getElementById('totalUpdates');

        if (avgFootfallEl) avgFootfallEl.textContent = this.formatNumber(Math.round(avgFootfall));
        if (avgCinemaEl) avgCinemaEl.textContent = this.formatNumber(Math.round(avgCinema));
        if (avgParkingEl) avgParkingEl.textContent = this.formatCurrency(avgParking);
        if (totalUpdatesEl) totalUpdatesEl.textContent = footfall.length;

        // Calculate day-over-day comparison (previous day vs current day)
        if (footfall.length >= 2) {
            // Get the two most recent days
            const currentDayFootfall = footfall[footfall.length - 1] || 0;
            const previousDayFootfall = footfall[footfall.length - 2] || 0;

            const currentDayCinema = cinema[cinema.length - 1] || 0;
            const previousDayCinema = cinema[cinema.length - 2] || 0;

            const currentDayParking = parking[parking.length - 1] || 0;
            const previousDayParking = parking[parking.length - 2] || 0;

            // Calculate differences
            const footfallDiff = currentDayFootfall - previousDayFootfall;
            const cinemaDiff = currentDayCinema - previousDayCinema;
            const parkingDiff = currentDayParking - previousDayParking;

            // Update footfall trend
            this.updateDayOverDayIndicator('footfallTrend', footfallDiff, previousDayFootfall, 'Footfall');

            // Update cinema trend
            this.updateDayOverDayIndicator('cinemaTrend', cinemaDiff, previousDayCinema, 'Cinema');

            // Update parking trend
            this.updateDayOverDayIndicator('parkingTrend', parkingDiff, previousDayParking, 'Parking');
        }
    }

    updateDayOverDayIndicator(elementId, diff, previousValue, metricName) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const previousDay = previousValue || 0;
        const percentChange = previousDay > 0 ? ((diff / previousDay) * 100).toFixed(1) : '0';

        let icon = 'fa-minus';
        let color = '#858796';
        let text = 'no change';

        if (diff > 0) {
            icon = 'fa-arrow-up';
            color = '#1cc88a';
            text = `↑ +${this.formatNumber(diff)} (${percentChange}% increase)`;
        } else if (diff < 0) {
            icon = 'fa-arrow-down';
            color = '#e74a3b';
            text = `↓ ${this.formatNumber(diff)} (${Math.abs(percentChange)}% decrease)`;
        } else {
            text = `0 (no change)`;
        }

        element.innerHTML = `<i class="fas ${icon}" style="color: ${color};"></i> ${text} vs previous day`;
    }

    async updateSummaryCards(mallId = null) {
        try {
            const summary = await this.api.getDailyUpdatesSummary(mallId);
            if (!summary || summary.length === 0) return;

            const totalMallWalkin = summary.reduce((sum, item) => sum + (item.total_footfall || 0), 0);
            const totalCinemaWalkin = summary.reduce((sum, item) => sum + (item.total_cinema || 0), 0);
            const totalParkingCollection = summary.reduce((sum, item) => sum + (item.total_parking || 0), 0);
            const totalUpdates = summary.reduce((sum, item) => sum + (item.total_updates || 0), 0);
            const avgCinema = totalUpdates > 0 ? Math.round(totalCinemaWalkin / totalUpdates) : 0;
            const avgFootfall = totalUpdates > 0 ? Math.round(totalMallWalkin / totalUpdates) : 0;

            const totalMallWalkinEl = document.getElementById('totalMallWalkin');
            const totalCinemaWalkinEl = document.getElementById('totalCinemaWalkin');
            const totalParkingCollectionEl = document.getElementById('totalParkingCollection');
            const avgCinemaEl = document.getElementById('avgCinema');
            const avgFootfallEl = document.getElementById('avgFootfall');

            if (totalMallWalkinEl) totalMallWalkinEl.textContent = this.formatLargeNumber(totalMallWalkin);
            if (totalCinemaWalkinEl) totalCinemaWalkinEl.textContent = this.formatLargeNumber(totalCinemaWalkin);
            if (totalParkingCollectionEl) totalParkingCollectionEl.textContent = '₹' + this.formatLargeNumber(totalParkingCollection);
            if (avgCinemaEl) avgCinemaEl.textContent = this.formatNumber(avgCinema);
            if (avgFootfallEl) avgFootfallEl.textContent = this.formatNumber(avgFootfall);
        } catch (error) {
            console.error('Error loading summary cards:', error);
        }
    }

    async updatePerformanceTable() {
        const tbody = document.getElementById('performanceTableBody');
        if (!tbody) return;

        try {
            const mallId = document.getElementById('mallFilter')?.value || null;
            const summary = await this.api.getDailyUpdatesSummary(mallId);

            if (!summary || summary.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-4">No mall-wise data available</td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = summary.map(item => {
                return `
                    <tr>
                        <td data-label="Mall Name"><strong>${item.mall_name || 'Unknown Mall'}</strong></td>
                        <td data-label="Total Updates" class="text-end">${this.formatNumber(item.total_updates)}</td>
                        <td data-label="Total Footfall" class="text-end">${this.formatNumber(item.total_footfall)}</td>
                        <td data-label="Cinema Walk-in" class="text-end">${this.formatNumber(item.total_cinema)}</td>
                        <td data-label="Parking Collection" class="text-end">${this.formatCurrency(item.total_parking)}</td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading performance summary:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger py-4">Failed to load performance summary</td>
                </tr>
            `;
        }
    }

    updateMainChart() {
        if (!this.currentData) return;

        const canvas = document.getElementById('mainChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const chartType = 'bar'; // Default to bar chart as requested

        // Destroy existing chart
        if (this.charts.main) {
            this.charts.main.destroy();
        }

        const dates = this.currentData.dates.map(d => this.formatDate(d));

        this.charts.main = new Chart(ctx, {
            type: chartType,
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Mall Footfall',
                        data: this.currentData.mall_footfall,
                        backgroundColor: 'rgba(78, 115, 223, 0.8)',
                        borderColor: '#4e73df',
                        borderWidth: 1,
                        borderRadius: 5
                    },
                    {
                        label: 'Cinema Walk-in',
                        data: this.currentData.cinema_walkin,
                        backgroundColor: 'rgba(231, 76, 60, 0.8)',
                        borderColor: '#e74a3b',
                        borderWidth: 1,
                        borderRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Comparison: Mall Footfall vs Cinema Walk-in',
                        font: { family: 'Rubik', size: 14 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${this.formatNumber(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatNumber(value)
                        }
                    }
                }
            }
        });
    }

    updateVehicleChart() {
        if (!this.currentData) return;

        const canvas = document.getElementById('vehicleChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.vehicle) {
            this.charts.vehicle.destroy();
        }

        const twoWheelers = this.currentData.two_wheelers.reduce((a, b) => a + b, 0);
        const fourWheelers = this.currentData.four_wheelers.reduce((a, b) => a + b, 0);

        if (twoWheelers === 0 && fourWheelers === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px Rubik, sans-serif';
            ctx.fillStyle = '#858796';
            ctx.textAlign = 'center';
            ctx.fillText('No vehicle data available', canvas.width / 2, canvas.height / 2);
            return;
        }

        this.charts.vehicle = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['2-Wheelers', '4-Wheelers'],
                datasets: [{
                    data: [twoWheelers, fourWheelers],
                    backgroundColor: ['#4e73df', '#1cc88a'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Rubik, sans-serif', size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${this.formatNumber(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateUtilityChart() {
        if (!this.currentData) return;

        const canvas = document.getElementById('utilityChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.utility) {
            this.charts.utility.destroy();
        }

        const dates = this.currentData.dates.map(d => this.formatDate(d));

        this.charts.utility = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'KEB Usage (Units)',
                        data: this.currentData.keb_usage,
                        borderColor: '#f6c23e',
                        backgroundColor: 'rgba(246, 194, 62, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Water Consumption (KL)',
                        data: this.currentData.water_consumption,
                        borderColor: '#36b9cc',
                        backgroundColor: 'rgba(54, 185, 204, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                let value = context.raw;
                                if (label.includes('KEB')) {
                                    return `${label}: ${this.formatNumber(value)} units`;
                                } else {
                                    return `${label}: ${this.formatNumber(value)} KL`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'KEB Units',
                            font: { family: 'Rubik', size: 12 }
                        },
                        ticks: {
                            callback: (value) => this.formatNumber(value)
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Water (KL)',
                            font: { family: 'Rubik', size: 12 }
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: (value) => this.formatNumber(value)
                        }
                    }
                }
            }
        });
    }

    async loadDetailedData() {
        try {
            const mallId = document.getElementById('mallFilter')?.value || '';
            const startDate = document.getElementById('detailStartDate')?.value;
            const endDate = document.getElementById('detailEndDate')?.value;

            const filters = { limit: 50 };
            if (mallId) filters.mall_id = mallId;
            if (startDate) filters.start_date = startDate;
            if (endDate) filters.end_date = endDate;

            const updates = await this.api.getDailyUpdates(filters);
            const tbody = document.getElementById('detailsTableBody');
            if (!tbody) return;

            if (updates && updates.length > 0) {
                // Show only first 5 rows as default
                const showAll = document.getElementById('showAllRows')?.checked;
                const rowsToShow = showAll ? updates : updates.slice(0, 5);

                tbody.innerHTML = rowsToShow.map(update => `
                    <tr>
                        <td>${this.formatDate(update.update_date)}</td>
                        <td>${update.mall_name || 'N/A'}</td>
                        <td class="text-end">${this.formatNumber(update.mall_footfall)}</td>
                        <td class="text-end">${this.formatNumber(update.cinema_walkin)}</td>
                        <td class="text-end">${this.formatCurrency(update.parking_collection)}</td>
                        <td class="text-end">${this.formatNumber(update.two_wheeler_count)}</td>
                        <td class="text-end">${this.formatNumber(update.four_wheeler_count)}</td>
                        <td class="text-end">${this.formatNumber(update.keb_usage_units)}</td>
                        <td class="text-end">${this.formatNumber(update.water_consumption_kl)}</td>
                        <td class="text-end">${this.formatNumber(update.diesel_consumption_ltr)}</td>
                    </tr>
                `).join('');

                // Add row count indicator
                const rowCountEl = document.getElementById('rowCount');
                if (rowCountEl) {
                    rowCountEl.textContent = `Showing ${rowsToShow.length} of ${updates.length} records`;
                }
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-center py-4">
                            <i class="fas fa-inbox fa-2x mb-3 d-block"></i>
                            No data available for selected criteria
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Error loading detailed data:', error);
        }
    }

    updateChartType() {
        // Chart type switching disabled - now fixed to bar chart
        this.showNotification('Chart type is fixed to bar chart for better comparison', 'info');
    }

    // ==================== TOTAL METRICS METHODS ====================

    formatLargeNumber(num) {
        if (num === undefined || num === null || num === 0) return '0';

        const absNum = Math.abs(num);

        if (absNum >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (absNum >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        } else {
            return num.toString();
        }
    }

    async updateTotalMetrics() {
        try {
            const mallId = document.getElementById('mallFilter')?.value || null;
            const summary = await this.api.getDailyUpdatesSummary(mallId);

            if (!summary || summary.length === 0) return;

            const totalMallWalkin = summary.reduce((sum, item) => sum + (item.total_footfall || 0), 0);
            const totalCinemaWalkin = summary.reduce((sum, item) => sum + (item.total_cinema || 0), 0);
            const totalParkingCollection = summary.reduce((sum, item) => sum + (item.total_parking || 0), 0);
            const totalUpdates = summary.reduce((sum, item) => sum + (item.total_updates || 0), 0);
            const avgCinema = totalUpdates > 0 ? Math.round(totalCinemaWalkin / totalUpdates) : 0;
            const avgFootfall = totalUpdates > 0 ? Math.round(totalMallWalkin / totalUpdates) : 0;

            document.getElementById('totalMallWalkin').textContent = this.formatLargeNumber(totalMallWalkin);
            document.getElementById('totalCinemaWalkin').textContent = this.formatLargeNumber(totalCinemaWalkin);
            document.getElementById('avgCinema').textContent = this.formatNumber(avgCinema);
            document.getElementById('avgFootfall').textContent = this.formatNumber(avgFootfall);
            document.getElementById('totalParkingCollection').textContent = '₹' + this.formatLargeNumber(totalParkingCollection);

        } catch (error) {
            console.error('Error updating total metrics:', error);
        }
    }

    // ==================== HISTOGRAM METHODS ====================

    async loadHistogram() {
        this.showLoading(true);

        try {
            const mallId = document.getElementById('histogramMallFilter')?.value || '';
            const period = document.getElementById('periodFilter')?.value || 'daily';
            const startDate = document.getElementById('histogramStartDate')?.value;
            const endDate = document.getElementById('histogramEndDate')?.value;
            const selectedMetric = document.getElementById('histogramMetricSelect')?.value || 'all';

            const filters = { period: period };
            if (mallId) filters.mall_id = mallId;
            if (startDate) filters.start_date = startDate;
            if (endDate) filters.end_date = endDate;

            const data = await this.api.getDailyUpdatesComparison(filters);

            let filteredData = this.filterByDateRange(data, startDate, endDate);

            const totalRecords = document.getElementById('totalRecords');
            if (totalRecords) {
                totalRecords.textContent = `Total Records: ${filteredData.dates.length}`;
            }

            this.createHistogram(filteredData, selectedMetric);

        } catch (error) {
            console.error('Error loading histogram:', error);
            this.showNotification('Failed to load histogram data', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    filterByDateRange(data, startDate, endDate) {
        if (!startDate && !endDate) return data;

        const filtered = {
            dates: [],
            mall_footfall: [],
            cinema_walkin: [],
            parking_collection: [],
            two_wheelers: [],
            four_wheelers: [],
            keb_usage: [],
            dg_usage: [],
            water_consumption: [],
            diesel_consumption: []
        };

        for (let i = 0; i < data.dates.length; i++) {
            const currentDate = new Date(data.dates[i]);

            if (startDate && new Date(startDate) > currentDate) continue;
            if (endDate && new Date(endDate) < currentDate) continue;

            filtered.dates.push(data.dates[i]);
            filtered.mall_footfall.push(data.mall_footfall[i] || 0);
            filtered.cinema_walkin.push(data.cinema_walkin[i] || 0);
            filtered.parking_collection.push(data.parking_collection[i] || 0);
            filtered.two_wheelers.push(data.two_wheelers[i] || 0);
            filtered.four_wheelers.push(data.four_wheelers[i] || 0);
            filtered.keb_usage.push(data.keb_usage[i] || 0);
            filtered.dg_usage.push(data.dg_usage[i] || 0);
            filtered.water_consumption.push(data.water_consumption[i] || 0);
            filtered.diesel_consumption.push(data.diesel_consumption[i] || 0);
        }

        return filtered;
    }

    createHistogram(data, selectedMetric) {
        const canvas = document.getElementById('histogramChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.charts.histogram) {
            this.charts.histogram.destroy();
        }

        const colorMap = {
            'mall_footfall': { bg: 'rgba(78, 115, 223, 0.7)', border: '#4e73df' },
            'cinema_walkin': { bg: 'rgba(231, 76, 60, 0.7)', border: '#e74a3b' },
            'parking_collection': { bg: 'rgba(28, 200, 138, 0.7)', border: '#1cc88a' },
            'two_wheelers': { bg: 'rgba(54, 185, 204, 0.7)', border: '#36b9cc' },
            'four_wheelers': { bg: 'rgba(246, 194, 62, 0.7)', border: '#f6c23e' },
            'keb_usage': { bg: 'rgba(133, 135, 150, 0.7)', border: '#858796' },
            'dg_usage': { bg: 'rgba(90, 92, 105, 0.7)', border: '#5a5c69' },
            'water_consumption': { bg: 'rgba(58, 123, 213, 0.7)', border: '#3a7bd5' },
            'diesel_consumption': { bg: 'rgba(44, 62, 80, 0.7)', border: '#2c3e50' }
        };

        let datasets = [];

        if (selectedMetric === 'all') {
            datasets = [
                {
                    label: 'Mall Footfall',
                    data: data.mall_footfall,
                    backgroundColor: colorMap.mall_footfall.bg,
                    borderColor: colorMap.mall_footfall.border,
                    borderWidth: 1
                },
                {
                    label: 'Cinema Walk-in',
                    data: data.cinema_walkin,
                    backgroundColor: colorMap.cinema_walkin.bg,
                    borderColor: colorMap.cinema_walkin.border,
                    borderWidth: 1
                },
                {
                    label: 'Parking Collection (₹)',
                    data: data.parking_collection,
                    backgroundColor: colorMap.parking_collection.bg,
                    borderColor: colorMap.parking_collection.border,
                    borderWidth: 1
                },
                {
                    label: '2-Wheelers',
                    data: data.two_wheelers,
                    backgroundColor: colorMap.two_wheelers.bg,
                    borderColor: colorMap.two_wheelers.border,
                    borderWidth: 1
                },
                {
                    label: '4-Wheelers',
                    data: data.four_wheelers,
                    backgroundColor: colorMap.four_wheelers.bg,
                    borderColor: colorMap.four_wheelers.border,
                    borderWidth: 1
                },
                {
                    label: 'KEB Usage (Units)',
                    data: data.keb_usage,
                    backgroundColor: colorMap.keb_usage.bg,
                    borderColor: colorMap.keb_usage.border,
                    borderWidth: 1
                },
                {
                    label: 'DG Usage (Units)',
                    data: data.dg_usage,
                    backgroundColor: colorMap.dg_usage.bg,
                    borderColor: colorMap.dg_usage.border,
                    borderWidth: 1
                },
                {
                    label: 'Water (KL)',
                    data: data.water_consumption,
                    backgroundColor: colorMap.water_consumption.bg,
                    borderColor: colorMap.water_consumption.border,
                    borderWidth: 1
                },
                {
                    label: 'Diesel (L)',
                    data: data.diesel_consumption,
                    backgroundColor: colorMap.diesel_consumption.bg,
                    borderColor: colorMap.diesel_consumption.border,
                    borderWidth: 1
                }
            ];
        } else {
            datasets = [{
                label: this.getMetricLabel(selectedMetric),
                data: data[selectedMetric] || [],
                backgroundColor: colorMap[selectedMetric]?.bg || 'rgba(78, 115, 223, 0.7)',
                borderColor: colorMap[selectedMetric]?.border || '#4e73df',
                borderWidth: 1
            }];
        }

        this.charts.histogram = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.dates.map(date => this.formatDate(date)),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: selectedMetric === 'all' ?
                            'All Metrics Distribution' :
                            `${this.getMetricLabel(selectedMetric)} Distribution`,
                        font: { family: 'Rubik', size: 14 }
                    },
                    legend: {
                        display: selectedMetric === 'all',
                        position: 'top',
                        labels: {
                            font: { family: 'Times New Roman', size: 11 },
                            boxWidth: 12,
                            padding: 15
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                let value = context.raw;

                                if (label.includes('Parking') || label.includes('₹')) {
                                    return `${label}: ₹${this.formatNumber(value)}`;
                                } else if (label.includes('Units') || label.includes('KL') || label.includes('L')) {
                                    return `${label}: ${this.formatNumber(value)}`;
                                } else {
                                    return `${label}: ${this.formatNumber(value)}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: { size: 10 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            callback: (value) => this.formatNumber(value),
                            font: { size: 11 }
                        },
                        title: {
                            display: true,
                            text: selectedMetric === 'all' ? 'Count / Amount' : 'Value',
                            font: { family: 'Rubik', size: 12 }
                        }
                    }
                }
            }
        });

        this.updateHistogramLegend(selectedMetric);
    }

    getMetricLabel(metric) {
        const labels = {
            'mall_footfall': 'Mall Footfall',
            'cinema_walkin': 'Cinema Walk-in',
            'parking_collection': 'Parking Collection (₹)',
            'two_wheelers': '2-Wheelers',
            'four_wheelers': '4-Wheelers',
            'keb_usage': 'KEB Usage (Units)',
            'dg_usage': 'DG Usage (Units)',
            'water_consumption': 'Water Consumption (KL)',
            'diesel_consumption': 'Diesel Consumption (L)',
            'work_permits': 'Work Permits'
        };
        return labels[metric] || metric;
    }

    setDefaultDateRange() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const startDateInput = document.getElementById('histogramStartDate');
        const endDateInput = document.getElementById('histogramEndDate');

        if (startDateInput) {
            startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        }
        if (endDateInput) {
            endDateInput.value = today.toISOString().split('T')[0];
        }
    }

    updateHistogramLegend(selectedMetric) {
        const legendContainer = document.getElementById('histogramLegend');
        if (!legendContainer) return;

        const colorMap = {
            'mall_footfall': { bg: '#4e73df', label: 'Mall Footfall' },
            'cinema_walkin': { bg: '#e74a3b', label: 'Cinema Walk-in' },
            'parking_collection': { bg: '#1cc88a', label: 'Parking Collection' },
            'two_wheelers': { bg: '#36b9cc', label: '2-Wheelers' },
            'four_wheelers': { bg: '#f6c23e', label: '4-Wheelers' },
            'keb_usage': { bg: '#858796', label: 'KEB Usage' },
            'dg_usage': { bg: '#5a5c69', label: 'DG Usage' },
            'water_consumption': { bg: '#3a7bd5', label: 'Water Consumption' },
            'diesel_consumption': { bg: '#2c3e50', label: 'Diesel Consumption' }
        };

        if (selectedMetric === 'all') {
            legendContainer.innerHTML = Object.values(colorMap).map(item =>
                `<span class="badge" style="background-color: ${item.bg}; color: white; padding: 8px 15px; border-radius: 20px;">${item.label}</span>`
            ).join('');
        } else {
            const metric = colorMap[selectedMetric];
            if (metric) {
                legendContainer.innerHTML =
                    `<span class="badge" style="background-color: ${metric.bg}; color: white; padding: 8px 15px; border-radius: 20px;">${metric.label}</span>`;
            }
        }
    }

    // ==================== EXPORT AND PRINT METHODS ====================

    exportData() {
        try {
            const mallId = document.getElementById('mallFilter')?.value || 'all';
            const startDate = document.getElementById('detailStartDate')?.value;
            const endDate = document.getElementById('detailEndDate')?.value;

            // Get table data
            const table = document.getElementById('detailsTable');
            if (!table) {
                this.showNotification('No data to export', 'warning');
                return;
            }

            // Convert table to CSV
            const rows = [];
            const headers = [];

            // Get headers
            table.querySelectorAll('thead th').forEach(th => {
                headers.push(th.textContent);
            });
            rows.push(headers.join(','));

            // Get data rows
            table.querySelectorAll('tbody tr').forEach(tr => {
                const row = [];
                tr.querySelectorAll('td').forEach(td => {
                    row.push('"' + td.textContent.trim() + '"');
                });
                if (row.length > 0) {
                    rows.push(row.join(','));
                }
            });

            // Create CSV file
            const csvContent = rows.join('\n');
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `daily_updates_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showNotification('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export data', 'danger');
        }
    }

    printData() {
        window.print();
    }

    // ==================== UTILITY METHODS ====================

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'success') {
        const existingToasts = document.querySelectorAll('.notification-toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `position-fixed top-0 end-0 m-3 alert alert-${type} shadow-lg notification-toast`;
        toast.style.zIndex = '9999';
        toast.style.minWidth = '300px';
        toast.style.animation = 'slideIn 0.3s ease-out';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2 fa-lg"></i>
                <span class="flex-grow-1">${message}</span>
                <button type="button" class="btn-close ms-3" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    formatNumber(num) {
        if (num === undefined || num === null) return '0';
        return new Intl.NumberFormat('en-IN').format(num);
    }

    formatCurrency(num) {
        if (num === undefined || num === null) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(num);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    }
}

// Global functions
window.loadVisualization = function () {
    if (window.dailyViz) {
        window.dailyViz.loadVisualization();
    }
};

window.exportChartData = function () {
    if (window.dailyViz) {
        window.dailyViz.exportData();
    } else {
        alert('Export feature ready - please refresh');
    }
};

window.printChart = function () {
    if (window.dailyViz) {
        window.dailyViz.printData();
    } else {
        window.print();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.dailyViz = new DailyUpdatesVisualization();
    }, 200);
});

// Global logout
window.logout = () => {
    if (auth && typeof auth.logout === 'function') {
        auth.logout();
    } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
};