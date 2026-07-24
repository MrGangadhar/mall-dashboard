// WebSocket Service
class WebSocketService {
    constructor() {
        this.socket = null;
        this.callbacks = new Map();
    }

    connect() {
        this.socket = io('http://localhost:5000');

        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
        });

        this.socket.on('data_update', (data) => {
            console.log('📡 Update received:', data);
            const callbacks = this.callbacks.get('data_update') || [];
            callbacks.forEach(cb => cb(data));
        });

        this.socket.on('disconnect', () => {
            console.log('❌ WebSocket disconnected');
            setTimeout(() => this.connect(), 3000);
        });
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