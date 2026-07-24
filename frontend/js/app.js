// Main Application
class App {
    constructor() {
        // Ensure API is defined
        if (typeof API === 'undefined') {
            console.error('❌ API class not found. Make sure api.js is loaded before app.js.');
            return;
        }
        this.api = new API();
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Mall Analytics');
        
        // Check authentication
        const token = localStorage.getItem('auth_token');
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('login.html');
        
        if (!token && !isLoginPage) {
            console.log('🔒 No token found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        // Initialize WebSocket if available
        if (typeof io !== 'undefined' && typeof ws !== 'undefined') {
            ws.connect();
        } else {
            console.warn('⚠️ WebSocket not available (io or ws not defined)');
        }

        // Load common data
        try {
            await this.loadCommonData();
        } catch (error) {
            console.error('❌ Error loading common data:', error);
        }

        // Initialize current page
        this.initPage();
    }

    async loadCommonData() {
        try {
            const malls = await this.api.getMalls();
            this.populateMallDropdowns(malls);
            console.log('✅ Common data loaded, malls:', malls);
        } catch (error) {
            console.error('❌ Error loading common data:', error);
            throw error;
        }
    }

    populateMallDropdowns(malls) {
        const selects = document.querySelectorAll('.mall-select');
        selects.forEach(select => {
            select.innerHTML = '<option value="">All Malls</option>';
            malls.forEach(mall => {
                select.innerHTML += `<option value="${mall.id}">${mall.name}</option>`;
            });
        });
    }

    initPage() {
        const path = window.location.pathname;
        console.log('📄 Current page:', path);
        
        try {
            if (path.includes('dashboard.html')) {
                if (typeof Dashboard === 'undefined') {
                    console.error('❌ Dashboard class not found. Make sure dashboard.js is loaded.');
                    return;
                }
                window.dashboard = new Dashboard();
                console.log('✅ Dashboard initialized');
            } else if (path.includes('sales-dashboard.html')) {
                if (typeof SalesDashboard === 'undefined') {
                    console.error('❌ SalesDashboard class not found.');
                    return;
                }
                window.salesDashboard = new SalesDashboard();
            } else if (path.includes('walkin-dashboard.html')) {
                if (typeof WalkinDashboard === 'undefined') {
                    console.error('❌ WalkinDashboard class not found.');
                    return;
                }
                window.walkinDashboard = new WalkinDashboard();
            } else if (path.includes('rent-dashboard.html')) {
                if (typeof RentDashboard === 'undefined') {
                    console.error('❌ RentDashboard class not found.');
                    return;
                }
                window.rentDashboard = new RentDashboard();
            }
        } catch (error) {
            console.error('❌ Error initializing page:', error);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if Bootstrap is loaded (needed for modals)
    if (typeof bootstrap === 'undefined') {
        console.error('❌ Bootstrap is not loaded. Modals will not work. Include Bootstrap JS in your HTML.');
    } else {
        console.log('✅ Bootstrap detected');
    }

    // Check if API is defined
    if (typeof API === 'undefined') {
        console.error('❌ API class is not defined. Make sure api.js is loaded.');
    }

    window.app = new App();
});