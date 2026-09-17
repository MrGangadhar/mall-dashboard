// Authentication Module
class Auth {
    constructor() {
        const getBaseURL = () => {
            // Allow explicit override via window.API_BASE_URL
            if (typeof window !== 'undefined' && window.API_BASE_URL) {
                return window.API_BASE_URL;
            }
            if (typeof window !== 'undefined' && window.location) {
                const { hostname, protocol, origin, port } = window.location;
                // Local development
                if (hostname === '127.0.0.1' || hostname === 'localhost' || protocol === 'file:') {
                    return 'http://127.0.0.1:5000/api';
                }
                // Render hosted directly
                if (hostname.includes('onrender.com') || port === '5000') {
                    return origin + '/api';
                }
                // Netlify hosted — proxy /api/* → Render backend via netlify.toml
                if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
                    return origin + '/api';
                }
            }
            // Fallback: direct Render URL
            return 'https://mall-dashboard.onrender.com/api';
        };
        this.baseURL = getBaseURL();
        this.token = localStorage.getItem('auth_token');
        try {
            this.user = JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            this.user = null;
        }
        console.log('🔐 Auth constructor - baseURL:', this.baseURL);
        console.log('🔐 Auth constructor - token exists:', !!this.token);
        console.log('🔐 Current page:', window.location.pathname);
    }

    getToken() {
        this.token = localStorage.getItem('auth_token');
        return this.token;
    }

    async login(username, password) {
        const loginUrl = `${this.baseURL}/auth/login`;
        console.log('📤 Login attempt to:', loginUrl);
        try {
            // Attempt up to 2 times to handle Render cold start
            let response;
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    response = await fetch(loginUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password }),
                        credentials: 'include'
                    });
                    break; // Success, exit retry loop
                } catch (fetchErr) {
                    if (attempt === 2) throw fetchErr;
                    console.warn(`⚠️ Login attempt ${attempt} failed, retrying in 2s...`, fetchErr.message);
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            console.log('📥 Login response status:', response.status);

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ Non-JSON response received:', text.substring(0, 300));
                return {
                    success: false,
                    error: `Server error (${response.status}). The backend may be starting up — please try again in a few seconds.`
                };
            }

            const data = await response.json();
            console.log('📦 Login response data:', data);

            if (data.success && data.token) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                const storedToken = localStorage.getItem('auth_token');
                if (!storedToken) {
                    console.error('❌ Token was NOT stored!');
                    return { success: false, error: 'Failed to store authentication token' };
                }

                console.log('✅ Login successful, redirecting...');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 100);

                return { success: true };
            } else {
                console.error('❌ Login failed:', data.error);
                return { success: false, error: data.error || 'Login failed. Please check your credentials.' };
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                return { success: false, error: 'Cannot connect to server. The backend may be starting up — please try again in 30 seconds.' };
            }
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