from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
from flask_login import login_required, current_user
from services.auth_service import AuthService, token_required
from database.models import db, User
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
@cross_origin(supports_credentials=True)
def register():
    """User registration"""
    try:
        data = request.json
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name')
        
        if not all([username, email, password]):
            return jsonify({'error': 'Username, email and password are required'}), 400
        
        success, result = AuthService.register_user(username, email, password, full_name)
        
        if success:
            return jsonify({'success': True, 'message': result}), 201
        else:
            return jsonify({'error': result}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
@cross_origin(supports_credentials=True)
def login():
    """User login"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        success, result = AuthService.login_user(username, password)
        
        if success:
            return jsonify({
                'success': True,
                'message': result['message'],
                'token': result['token'],
                'user': result['user']
            }), 200
        else:
            return jsonify({'error': result}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def logout():
    """User logout"""
    try:
        success, message = AuthService.logout_user()
        return jsonify({'success': success, 'message': message}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
@cross_origin(supports_credentials=True)
@token_required
def get_profile():
    """Get current user profile (using token)"""
    try:
        user = request.current_user
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'last_login': user.last_login.isoformat() if user.last_login else None
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/verify-token', methods=['GET'])
@cross_origin(supports_credentials=True)
@token_required
def verify_token():
    """Verify if token is valid"""
    return jsonify({'valid': True, 'user': request.current_user.username}), 200

@auth_bp.route('/change-password', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def change_password():
    """Change user password"""
    try:
        data = request.json
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not old_password or not new_password:
            return jsonify({'error': 'Old and new password required'}), 400
        
        success, message = AuthService.change_password(current_user.id, old_password, new_password)
        
        if success:
            return jsonify({'success': True, 'message': message}), 200
        else:
            return jsonify({'error': message}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/check-auth', methods=['GET'])
@cross_origin(supports_credentials=True)
@login_required
def check_auth():
    """Check if user is authenticated (session-based)"""
    return jsonify({
        'authenticated': True,
        'user': {
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'full_name': current_user.full_name,
            'role': current_user.role
        }
    }), 200