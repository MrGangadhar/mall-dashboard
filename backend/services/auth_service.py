from flask_login import LoginManager, login_user, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from database.models import db, User
import jwt
from config import Config
from functools import wraps
from flask import request, jsonify

login_manager = LoginManager()

class AuthService:
    
    @staticmethod
    @login_manager.user_loader
    def load_user(user_id):
        """Load user by ID for Flask-Login session management."""
        return User.query.get(int(user_id))
    
    @staticmethod
    def generate_token(user):
        """Generate a JWT token for the user (expires in 24 hours)."""
        payload = {
            'user_id': user.id,
            'username': user.username,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')
    
    @staticmethod
    def verify_token(token):
        """Verify JWT token and return the corresponding User object, or None if invalid."""
        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
            user = User.query.get(payload['user_id'])
            return user
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def login_user(username, password):
        """Authenticate user with username/password.
        Returns (success, result) where result is either an error message or a dict with token and user info.
        """
        try:
            user = User.query.filter_by(username=username).first()
            
            if not user or not user.check_password(password):
                return False, "Invalid username or password"
            
            if not user.is_active:
                return False, "Account is deactivated"
            
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Generate JWT token for API authentication
            token = AuthService.generate_token(user)
            
            # Also create a Flask-Login session (for web interface)
            login_user(user, remember=True)
            
            return True, {
                'message': 'Login successful',
                'token': token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role
                }
            }
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    def logout_user():
        """Log out the current user (Flask-Login session)."""
        logout_user()
        return True, "Logged out successfully"
    
    @staticmethod
    def change_password(user_id, old_password, new_password):
        """Change user password."""
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "User not found"
            
            if not user.check_password(old_password):
                return False, "Current password is incorrect"
            
            user.set_password(new_password)
            db.session.commit()
            
            return True, "Password changed successfully"
        except Exception as e:
            db.session.rollback()
            return False, str(e)


# Token verification decorator for routes that require JWT authentication
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow OPTIONS requests without token (for CORS preflight)
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        
        token = None
        
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        user = AuthService.verify_token(token)
        if not user:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Attach the user to the request context for downstream use
        request.current_user = user
        return f(*args, **kwargs)
    
    return decorated