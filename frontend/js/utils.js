// Utility Functions
class Utils {
    static showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    static formatNumber(num) {
        if (num === undefined || num === null || isNaN(num)) return '0';
        return new Intl.NumberFormat('en-IN').format(num);
    }

    static formatCurrency(num) {
        if (num === undefined || num === null || isNaN(num)) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    }

    static formatDate(dateString) {
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
        } catch (e) {
            return dateString;
        }
    }

    static formatDateOnly(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    static groupBy(arr, key) {
        return arr.reduce((acc, item) => {
            const groupKey = item[key];
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(item);
            return acc;
        }, {});
    }

    static sortByKey(arr, key, order = 'asc') {
        return [...arr].sort((a, b) => {
            if (order === 'asc') {
                return a[key] > b[key] ? 1 : -1;
            } else {
                return a[key] < b[key] ? 1 : -1;
            }
        });
    }

    static generateRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    static downloadCSV(data, filename) {
        const csvContent = data.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    static downloadJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Legacy API helper
class LegacyAPI {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.getToken()}`
        };
        
        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            },
            credentials: 'include'
        };
        
        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                // Unauthorized - redirect to login
                auth.logout();
                throw new Error('Session expired. Please login again.');
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    }

    async checkAuth() {
        return this.request('/auth/check-auth');
    }

    // Dashboard endpoints
    async getDashboardOverview() {
        return this.request('/dashboard/overview');
    }

    async getMallPerformance(mallId = null, period = 'month') {
        const query = new URLSearchParams();
        if (mallId) query.append('mall_id', mallId);
        query.append('period', period);
        return this.request(`/dashboard/mall-performance?${query}`);
    }

    async getTenantPerformance(mallId = null, brandId = null) {
        const query = new URLSearchParams();
        if (mallId) query.append('mall_id', mallId);
        if (brandId) query.append('brand_id', brandId);
        return this.request(`/dashboard/tenant-performance?${query}`);
    }

    // Mall endpoints
    async getMalls() {
        return this.request('/malls');
    }

    async addMall(data) {
        return this.request('/malls', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Brand endpoints
    async getBrands(mallId = null) {
        const query = mallId ? `?mall_id=${mallId}` : '';
        return this.request(`/brands${query}`);
    }

    async addBrand(data) {
        return this.request('/brands', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async bulkAddBrands(brands) {
        return this.request('/brands/bulk', {
            method: 'POST',
            body: JSON.stringify({ brands })
        });
    }

    // Sales endpoints
    async getSalesData(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return this.request(`/sales-data?${query}`);
    }

    // Upload endpoints
    async downloadTemplate(type) {
        const response = await fetch(`${this.baseURL}/templates/download/${type}`, {
            headers: {
                'Authorization': `Bearer ${auth.getToken()}`
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to download template');
        }
        
        return response.blob();
    }

    // Upload history
    async getUploadHistory(mallId = null, days = 30) {
        const query = new URLSearchParams();
        if (mallId) query.append('mall_id', mallId);
        query.append('days', days);
        return this.request(`/upload-history?${query}`);
    }
}

// Export utilities to global scope
window.Utils = Utils;
// API implementation is provided by js/shared/api.js