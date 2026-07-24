// API Service
class API {
    constructor() {
        // ============================================================
        // 🔧 UPDATE THIS URL TO YOUR DEPLOYED BACKEND
        // Replace with your Render or PythonAnywhere URL:
        // example: https://your-app-name.onrender.com/api
        // ============================================================
       this.baseURL = window.API_BASE_URL || 'https://mall-dashboard.onrender.com/api';
        // For local development, you can set window.API_BASE_URL = 'http://127.0.0.1:5000/api';
        // before loading this script, or change the fallback above.
        
        this.refreshToken = localStorage.getItem('refresh_token');
    }

    // Get current token (from auth or localStorage)
    _getToken() {
        if (typeof auth !== 'undefined' && auth.getToken) {
            return auth.getToken();
        }
        return localStorage.getItem('auth_token');
    }

    // Main request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this._getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers,
            credentials: 'include'
        };

        try {
            const response = await fetch(url, config);
            console.log(`📥 ${options.method || 'GET'} ${endpoint} → ${response.status}`);

            // If 401 and we have a refresh token, try refresh
            if (response.status === 401 && this.refreshToken) {
                const refreshed = await this._refreshAccessToken();
                if (refreshed) {
                    // Retry with new token
                    return this.request(endpoint, options);
                } else {
                    // Refresh failed – clear tokens and redirect
                    this._clearTokens();
                    window.location.href = '/index.html';
                    throw new Error('Session expired. Please log in again.');
                }
            }

            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || `HTTP error ${response.status}`);
                }
                return data;
            } else {
                const text = await response.text();
                if (response.ok) {
                    // Sometimes success responses are plain text – return as is
                    return text;
                } else {
                    throw new Error(`Server error: ${text.substring(0, 200)}`);
                }
            }
        } catch (error) {
            console.error('❌ API Error:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to server. Please check if backend is running.');
            }
            throw error;
        }
    }

    // Token refresh
    async _refreshAccessToken() {
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: this.refreshToken }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                this._setTokens(data.token, data.refresh_token);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    // Store tokens
    _setTokens(token, refreshToken = null) {
        localStorage.setItem('auth_token', token);
        if (refreshToken) {
            this.refreshToken = refreshToken;
            localStorage.setItem('refresh_token', refreshToken);
        }
        // Update auth if possible
        if (typeof auth !== 'undefined' && auth.setToken) {
            auth.setToken(token);
        }
    }

    // Clear all tokens
    _clearTokens() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        this.refreshToken = null;
        if (typeof auth !== 'undefined' && auth.clearTokens) {
            auth.clearTokens();
        }
    }

    // ========== AUTH ==========
    async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this._clearTokens();
            window.location.href = '/login.html';
        }
    }

    // ========== DASHBOARD ==========
    async getDashboardOverview() {
        return this.request('/dashboard/overview');
    }

    async getMallPerformance() {
        return this.request('/dashboard/mall-performance');
    }

    async getTenantPerformance() {
        return this.request('/dashboard/tenant-performance');
    }

    async getDailyUpdatesSummary(mallId = null) {
        const query = mallId ? `?mall_id=${mallId}` : '';
        return this.request(`/daily/daily-updates/summary${query}`);
    }

    // ========== MALLS ==========
    async getMalls() {
        return this.request('/malls');
    }

    async addMall(data) {
        return this.request('/malls', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // ========== BRANDS ==========
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

    // ========== UPLOADS ==========
    async uploadWalkinData(formData) {
        const token = this._getToken();
        const response = await fetch(`${this.baseURL}/upload/walkin`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
            credentials: 'include'
        });
        return this._handleUploadResponse(response);
    }

    async uploadSalesData(formData) {
        const token = this._getToken();
        const response = await fetch(`${this.baseURL}/upload/sales`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
            credentials: 'include'
        });
        return this._handleUploadResponse(response);
    }

    async uploadRentData(formData) {
        const token = this._getToken();
        const response = await fetch(`${this.baseURL}/upload/rent`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
            credentials: 'include'
        });
        return this._handleUploadResponse(response);
    }

    async _handleUploadResponse(response) {
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${errorText}`);
        }
        return response.json();
    }
}

// Make API globally available
window.API = API;