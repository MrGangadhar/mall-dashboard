from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
from datetime import datetime

socketio = SocketIO(cors_allowed_origins="*")

clients = {}

@socketio.on('connect')
def handle_connect():
    client_id = request.sid
    clients[client_id] = {
        'connected_at': datetime.now(),
        'rooms': []
    }
    emit('connected', {'client_id': client_id})

@socketio.on('disconnect')
def handle_disconnect():
    client_id = request.sid
    if client_id in clients:
        del clients[client_id]

@socketio.on('join_dashboard')
def handle_join_dashboard(data):
    room = data.get('dashboard', 'general')
    join_room(room)
    emit('joined', {'room': room})

def broadcast_data_update(data_type, mall_id=None):
    """Broadcast data update to all connected clients"""
    update_data = {
        'type': data_type,
        'mall_id': mall_id,
        'timestamp': datetime.now().isoformat(),
        'message': f'New {data_type} data uploaded'
    }
    socketio.emit('data_update', update_data)