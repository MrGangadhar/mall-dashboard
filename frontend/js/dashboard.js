// Dashboard Module
class Dashboard {
    constructor() {
        this.api = new API();
        this.charts = {};
        this.init();
    }

    async init() {
        // Check authentication
        if (!auth.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }

        // Load user info
        this.loadUserInfo();

        // Load dashboard data
        await this.loadDashboardOverview();
        await this.loadMallPerformance();
        await this.loadUploadHistory();
        await this.loadTopBrands();
        await this.loadAdditionalStats();

        // Initialize real-time updates
        this.initWebSocket();

        // Start auto-refresh
        this.startAutoRefresh();
    }

    loadUserInfo() {
        const user = auth.getUser();
        if (user) {
            const nameEl = document.getElementById('userFullName');
            const roleEl = document.getElementById('userRole');
            const initialsEl = document.getElementById('userInitials');

            if (nameEl) nameEl.textContent = `Welcome, ${user.full_name || user.username}`;
            if (roleEl) roleEl.textContent = user.role || 'Administrator';
            
            // Set avatar initials
            if (initialsEl) {
                const initials = (user.full_name || user.username).split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                initialsEl.textContent = initials;
            }
        }
    }

    async loadDashboardOverview() {
        try {
            const data = await this.api.getDashboardOverview();
            
            const mallsEl = document.getElementById('totalMalls');
            const brandsEl = document.getElementById('totalBrands');
            const salesEl = document.getElementById('totalSales');
            const rentEl = document.getElementById('totalRent');

            if (mallsEl) mallsEl.textContent = this.formatNumber(data.total_malls || 0);
            if (brandsEl) brandsEl.textContent = this.formatNumber(data.total_brands || 0);
            if (salesEl) salesEl.textContent = this.formatCurrency(data.total_sales || 0);
            if (rentEl) rentEl.textContent = this.formatCurrency(data.total_rent || 0);
            
            // Calculate collection rate
            const collectionRate = data.total_rent > 0 
                ? ((data.collected_rent || 0) / data.total_rent * 100).toFixed(1)
                : 0;
            
            const collectionEl = document.getElementById('collectionRate');
            if (collectionEl) {
                collectionEl.textContent = collectionRate;
            }
            
        } catch (error) {
            console.error('Error loading dashboard overview:', error);
            this.showNotification('Error loading dashboard data', 'danger');
        }
    }

    async loadAdditionalStats() {
        try {
            const summary = await this.api.getDailyUpdatesSummary();
            const totalUpdates = summary.reduce((sum, item) => sum + (item.total_records || 0), 0);
            const totalFootfall = summary.reduce((sum, item) => sum + (item.total_footfall || 0), 0);

            const walkinEl = document.getElementById('totalWalkin');
            if (walkinEl) {
                walkinEl.textContent = this.formatNumber(totalFootfall);
            }

            const dailyUpdatesEl = document.getElementById('dailyUpdates');
            if (dailyUpdatesEl) {
                dailyUpdatesEl.textContent = this.formatNumber(totalUpdates);
            }

        } catch (error) {
            console.error('Error loading additional stats:', error);
            const walkinEl = document.getElementById('totalWalkin');
            const dailyEl = document.getElementById('dailyUpdates');
            if (walkinEl) walkinEl.textContent = '0';
            if (dailyEl) dailyEl.textContent = '0';
        }
    }

    async loadMallPerformance() {
        try {
            const data = await this.api.getMallPerformance();
            
            if (!data || data.length === 0) {
                console.log('No mall performance data available');
                return;
            }
            
            const mallNames = data.map(m => m.mall_name || 'Unknown');
            const salesData = data.map(m => m.total_sales || 0);
            const rentData = data.map(m => m.total_rent || 0);
            
            // Properly destroy existing chart
            if (this.charts.mallPerformance) {
                this.charts.mallPerformance.destroy();
                this.charts.mallPerformance = null;
            }
            
            // Fix canvas context issue
            const chartCanvas = document.getElementById('mallPerformanceChart');
            if (!chartCanvas) {
                console.error('Chart canvas not found');
                return;
            }
            
            // Clear and recreate canvas to avoid context issues
            const parent = chartCanvas.parentNode;
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'mallPerformanceChart';
            parent.replaceChild(newCanvas, chartCanvas);
            
            const ctx = document.getElementById('mallPerformanceChart').getContext('2d');
            this.charts.mallPerformance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: mallNames,
                    datasets: [
                        {
                            label: 'Sales (₹)',
                            data: salesData,
                            backgroundColor: 'rgba(78, 115, 223, 0.8)',
                            borderRadius: 5
                        },
                        {
                            label: 'Rent (₹)',
                            data: rentData,
                            backgroundColor: 'rgba(246, 194, 62, 0.8)',
                            borderRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'top', 
                            labels: { 
                                font: { family: "'Inter', 'Rubik', sans-serif", size: 12 } 
                            } 
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.dataset.label}: ${this.formatCurrency(context.raw)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { 
                                callback: (value) => this.formatCurrency(value) 
                            }
                        }
                    }
                }
            });
            
            await this.loadCategoryDistribution();
            
        } catch (error) {
            console.error('Error loading mall performance:', error);
        }
    }

    async loadCategoryDistribution() {
        try {
            const brands = await this.api.getBrands();
            
            if (!brands || brands.length === 0) {
                console.log('No brand data available for category distribution');
                return;
            }
            
            const categories = {};
            brands.forEach(brand => {
                const category = brand.category || 'Other';
                categories[category] = (categories[category] || 0) + 1;
            });
            
            // Destroy existing chart
            if (this.charts.categoryDistribution) {
                this.charts.categoryDistribution.destroy();
                this.charts.categoryDistribution = null;
            }
            
            // Fix canvas context issue
            const chartCanvas = document.getElementById('categoryDistributionChart');
            if (!chartCanvas) {
                console.error('Category chart canvas not found');
                return;
            }
            
            const parent = chartCanvas.parentNode;
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'categoryDistributionChart';
            parent.replaceChild(newCanvas, chartCanvas);
            
            const ctx = document.getElementById('categoryDistributionChart').getContext('2d');
            this.charts.categoryDistribution = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categories),
                    datasets: [{
                        data: Object.values(categories),
                        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796', '#5a5c69', '#2c3e50'],
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
                                font: { family: "'Inter', 'Rubik', sans-serif", size: 12 } 
                            }
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Error loading category distribution:', error);
        }
    }

    async loadUploadHistory() {
        try {
            const history = await this.api.getUploadHistory();
            const tbody = document.getElementById('uploadHistoryTable');
            
            if (!tbody) return;
            
            const countEl = document.getElementById('uploadCount');
            if (countEl) countEl.textContent = `${history.length} Uploads`;
            
            if (history.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
                            <i class="fas fa-inbox fa-2x mb-3 d-block"></i>
                            No upload history available
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = history.slice(0, 5).map(item => `
                <tr>
                    <td>${this.formatDate(item.uploaded_at)}</td>
                    <td><span class="badge bg-${this.getUploadTypeColor(item.file_type)}">${item.file_type ? item.file_type.toUpperCase() : 'UNKNOWN'}</span></td>
                    <td><small>${item.file_name || 'Manual Entry'}</small></td>
                    <td><span class="badge bg-${item.status === 'Completed' ? 'success' : 'warning'}">${item.status || 'Pending'}</span></td>
                    <td><span class="fw-bold">${item.success_count || 0}</span> <small class="text-muted">/ ${item.records_processed || 0}</small></td>
                </tr>
            `).join('');
            
        } catch (error) {
            console.error('Error loading upload history:', error);
        }
    }

    async loadTopBrands() {
        try {
            const brands = await this.api.getTenantPerformance();
            
            const container = document.getElementById('topBrandsList');
            if (!container) return;
            
            if (!brands || brands.length === 0) {
                container.innerHTML = `<div class="text-center text-muted py-4"><i class="fas fa-store fa-2x mb-3 d-block"></i>No brand data available</div>`;
                return;
            }
            
            const topBrands = brands
                .sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))
                .slice(0, 5);
            
            container.innerHTML = topBrands.map((brand, index) => `
                <div class="list-group-item d-flex align-items-center py-3">
                    <div class="flex-shrink-0 me-3">
                        <span class="badge bg-${this.getRankBadgeColor(index + 1)}" style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;">${index + 1}</span>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1 fw-bold">${brand.brand_name || 'Unknown'}</h6>
                        <small class="text-muted">${brand.mall_name || 'N/A'} • ${brand.category || 'General'}</small>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-success">${this.formatCurrency(brand.total_sales || 0)}</div>
                        <small class="text-muted">${this.formatNumber(brand.transactions || 0)} transactions</small>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error loading top brands:', error);
        }
    }

    initWebSocket() {
        if (typeof io !== 'undefined') {
            try {
                const wsUrl = this.api.baseURL.replace('/api', '');
                const socket = io(wsUrl);
                socket.on('connect', () => {
                    console.log('WebSocket connected');
                    socket.emit('join_dashboard', { dashboard: 'main' });
                });
                socket.on('data_update', (data) => {
                    console.log('Real-time update received:', data);
                    this.showNotification('New data available! Refreshing...', 'info');
                    this.refreshAllData();
                });
                socket.on('disconnect', () => console.log('WebSocket disconnected'));
            } catch (e) {
                console.warn('WebSocket connection failed:', e);
            }
        } else {
            console.warn('Socket.io not available');
        }
    }

    startAutoRefresh() {
        setInterval(() => {
            console.log('Auto-refreshing dashboard...');
            this.refreshAllData();
        }, 30000);
    }

    // Helper to refresh all data
    refreshAllData() {
        this.loadDashboardOverview();
        this.loadMallPerformance();
        this.loadUploadHistory();
        this.loadTopBrands();
        this.loadAdditionalStats();
    }

    showSuccessAnimation() {
        const animation = document.getElementById('successAnimation');
        if (animation) {
            animation.style.display = 'flex';
            setTimeout(() => animation.style.display = 'none', 2000);
        }
    }

    showNotification(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `position-fixed top-0 end-0 m-3 alert alert-${type} shadow-lg`;
        toast.style.zIndex = '9999';
        toast.style.minWidth = '300px';
        toast.style.fontFamily = "'Inter', 'Rubik', sans-serif";
        toast.style.animation = 'slideInRight 0.4s ease-out';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-3" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    formatNumber(num) {
        if (num === undefined || num === null || isNaN(num)) return '0';
        return new Intl.NumberFormat('en-IN').format(num);
    }

    formatCurrency(num) {
        if (num === undefined || num === null || isNaN(num)) return '₹0';
        return new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR', 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
        }).format(num);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch {
            return dateString;
        }
    }

    getUploadTypeColor(type) {
        const colors = { 'sales': 'success', 'walkin': 'primary', 'rent': 'warning', 'brands': 'info' };
        return colors[type] || 'secondary';
    }

    getRankBadgeColor(rank) {
        const colors = { 1: 'warning', 2: 'secondary', 3: 'danger', 4: 'info', 5: 'primary' };
        return colors[rank] || 'light';
    }
}

// ==================== UPLOAD MODAL FUNCTIONS ====================
// Modal ID: uploadModal
function showUploadModal(type) {
    if (window.uploadModule) {
        window.uploadModule.showUploadModal(type);
    } else {
        console.error('Upload module not found');
        alert('Upload functionality not available');
    }
}

// ==================== ADD MALL MODAL FUNCTIONS ====================
// Modal ID: addMallModal
function addNewMall() {
    console.log('Opening Add Mall modal...');
    const modalEl = document.getElementById('addMallModal');
    if (!modalEl) {
        console.error('Add Mall modal element not found!');
        alert('Modal element missing. Please check the HTML.');
        return;
    }
    
    // Reset form
    const form = document.getElementById('addMallForm');
    if (form) form.reset();
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

async function saveNewMall() {
    const form = document.getElementById('addMallForm');
    if (!form) {
        alert('Form not found');
        return;
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validate required fields
    if (!data.name) {
        if (window.dashboard) window.dashboard.showNotification('Mall name is required', 'warning');
        return;
    }
    
    try {
        const api = new API();
        const result = await api.addMall(data);
        
        if (result.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addMallModal'));
            if (modal) modal.hide();
            
            // Show success
            if (window.dashboard) {
                window.dashboard.showSuccessAnimation();
                window.dashboard.showNotification('Mall added successfully!', 'success');
            }
            
            // Reset form
            form.reset();
            
            // Refresh dashboard data
            if (window.dashboard) {
                await window.dashboard.loadDashboardOverview();
                await window.dashboard.loadMallPerformance();
            }
        } else {
            throw new Error(result.error || 'Failed to add mall');
        }
    } catch (error) {
        console.error('Error adding mall:', error);
        if (window.dashboard) {
            window.dashboard.showNotification(error.message || 'Error adding mall', 'danger');
        }
    }
}

// ==================== ADD BRAND MODAL FUNCTIONS ====================
// Modal ID: addBrandModal
function addNewBrand() {
    console.log('Opening Add Brand modal...');
    
    const modalEl = document.getElementById('addBrandModal');
    if (!modalEl) {
        console.error('Add Brand modal element not found!');
        alert('Modal element missing. Please check the HTML.');
        return;
    }
    
    const select = document.querySelector('#addBrandModal select[name="mall_id"]');
    if (!select) {
        console.error('Select element not found in modal!');
        alert('Dropdown element missing in modal.');
        return;
    }
    
    // Reset form
    const form = document.getElementById('addBrandForm');
    if (form) form.reset();
    
    // Show loading state
    select.innerHTML = '<option value="">Loading malls...</option>';
    select.disabled = true;
    
    const modal = new bootstrap.Modal(modalEl);
    const api = new API();
    
    // Show modal immediately with loading state
    modal.show();
    
    api.getMalls()
        .then(malls => {
            console.log('Malls loaded:', malls);
            
            select.innerHTML = '';
            select.disabled = false;
            
            if (malls && malls.length > 0) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Choose Mall';
                select.appendChild(defaultOption);
                
                malls.forEach(mall => {
                    const option = document.createElement('option');
                    option.value = mall.id;
                    option.textContent = mall.name;
                    select.appendChild(option);
                });
            } else {
                select.innerHTML = '<option value="">No malls available. Please add a mall first.</option>';
                if (window.dashboard) {
                    window.dashboard.showNotification('Please add a mall first before adding brands.', 'warning');
                }
            }
        })
        .catch(err => {
            console.error('Error loading malls:', err);
            select.innerHTML = '<option value="">Failed to load malls. Please try again.</option>';
            select.disabled = false;
            if (window.dashboard) {
                window.dashboard.showNotification('Failed to load malls. Check backend connection.', 'danger');
            }
        });
}

async function saveNewBrand() {
    const form = document.getElementById('addBrandForm');
    if (!form) {
        alert('Form not found');
        return;
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validate required fields
    if (!data.mall_id) {
        if (window.dashboard) window.dashboard.showNotification('Please select a mall', 'warning');
        return;
    }
    if (!data.name) {
        if (window.dashboard) window.dashboard.showNotification('Brand name is required', 'warning');
        return;
    }
    
    try {
        const api = new API();
        const result = await api.addBrand(data);
        
        if (result.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addBrandModal'));
            if (modal) modal.hide();
            
            // Show success
            if (window.dashboard) {
                window.dashboard.showSuccessAnimation();
                window.dashboard.showNotification('Brand added successfully!', 'success');
            }
            
            // Reset form
            form.reset();
            
            // Refresh dashboard data
            if (window.dashboard) {
                await window.dashboard.loadDashboardOverview();
                await window.dashboard.loadCategoryDistribution();
                await window.dashboard.loadTopBrands();
            }
        } else {
            throw new Error(result.error || 'Failed to add brand');
        }
    } catch (error) {
        console.error('Error adding brand:', error);
        if (window.dashboard) {
            window.dashboard.showNotification(error.message || 'Error adding brand', 'danger');
        }
    }
}

// Initialize dashboard — single initialization point
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing Dashboard');
    window.dashboard = new Dashboard();
});