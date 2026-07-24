// Authentication Module
class Auth {
    constructor() {
        // Use the same API base URL as api.js (fallback to Render URL)
        this.baseURL = window.API_BASE_URL || 'https://mall-dashboard.onrender.com/api';
        this.token = localStorage.getItem('auth_token');
        try {
            this.user = JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            this.user = null;
        }
        console.log('🔐 Auth constructor - token from storage:', this.token);
        console.log('🔐 Auth constructor - token exists:', !!this.token);
        console.log('🔐 Current page:', window.location.pathname);
    }

    getToken() {
        this.token = localStorage.getItem('auth_token');
        console.log('📝 getToken() called, returning:', this.token);
        return this.token;
    }

    async login(username, password) {
        console.log('📤 Login attempt started');
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            console.log('📥 Login response status:', response.status);

            const data = await response.json();
            console.log('📦 Login response data:', data);

            if (data.success && data.token) {
                console.log('💾 Storing token in localStorage...');
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Verify storage immediately
                const storedToken = localStorage.getItem('auth_token');
                console.log('✅ Token stored, verification read:', storedToken);

                if (!storedToken) {
                    console.error('❌ Token was NOT stored!');
                    return { success: false, error: 'Failed to store token' };
                }

                console.log('🔄 Redirecting to dashboard in 100ms...');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 100);

                return { success: true };
            } else {
                console.error('❌ Login failed:', data.error);
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await fetch(`${this.baseURL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.getToken()}` },
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            // Redirect to login page (which is now index.html)
            window.location.href = 'index.html';
        }
    }

    isAuthenticated() {
        const token = this.getToken();
        console.log('🔍 isAuthenticated() check - token:', token);
        console.log('🔍 isAuthenticated() result:', !!token);
        return !!token;
    }

    getUser() {
        return this.user;
    }
}

// Global instance
const auth = new Auth();

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded on page:', window.location.pathname);
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('✅ Login form found, attaching handler');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🎯 Login form submitted');
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            const messageDiv = document.getElementById('loginMessage');

            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging in...';
            loginBtn.disabled = true;
            messageDiv.style.display = 'none';

            const result = await auth.login(username, password);

            if (!result.success) {
                console.log('❌ Login result not successful:', result);
                messageDiv.style.display = 'block';
                messageDiv.className = 'alert alert-danger mb-4';
                messageDiv.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${result.error}`;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login to Dashboard';
                loginBtn.disabled = false;
            }
        });
    } else {
        console.log('❌ Login form not found on this page');
    }
});

// Global logout
window.logout = () => auth.logout();