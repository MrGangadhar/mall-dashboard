// WebSocket Service
class WebSocketService {
    constructor() {
        this.socket = null;
        this.callbacks = new Map();
    }

    connect() {
        if (this.socket && this.socket.connected) {
            return;
        }

        // Use API base URL to derive WebSocket URL (remove /api suffix)
        const apiBase = window.API_BASE_URL || 'https://mall-dashboard.onrender.com/api';
        const wsUrl = apiBase.replace('/api', '');

        try {
            if (!this.socket) {
                this.socket = io(wsUrl, {
                    reconnection: true,
                    reconnectionAttempts: 10,
                    reconnectionDelay: 2000,
                    reconnectionDelayMax: 10000,
                    transports: ['websocket', 'polling']
                });

                this.socket.on('connect', () => {
                    console.log('✅ WebSocket connected');
                });

                this.socket.on('data_update', (data) => {
                    console.log('📡 Update received:', data);
                    const callbacks = this.callbacks.get('data_update') || [];
                    callbacks.forEach(cb => cb(data));
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('❌ WebSocket disconnected:', reason);
                });

                this.socket.on('connect_error', (err) => {
                    console.warn('⚠️ WebSocket connection error:', err.message);
                });
            } else if (!this.socket.connected) {
                this.socket.connect();
            }
        } catch (e) {
            console.warn('⚠️ WebSocket initialization failed:', e);
        }
    }

    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    joinDashboard(dashboard) {
        if (this.socket) {
            this.socket.emit('join_dashboard', { dashboard });
        }
    }
}

window.ws = new WebSocketService();