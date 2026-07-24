import os
import sys
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_login import LoginManager
from sqlalchemy import text

# Import config
try:
    from config import Config
except ImportError:
    print("⚠️  Config file not found. Using default configuration.")
    class Config:
        SECRET_KEY = 'dev-key'
        SQLALCHEMY_DATABASE_URI = 'sqlite:///app.db'
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        UPLOAD_FOLDER = 'uploads'

# Import database
from database import db

# Import blueprints (with fallbacks)
try:
    from routes.auth import auth_bp
    from routes.api import api_bp
    from routes.upload import upload_bp
    from routes.daily_updates import daily_updates_bp
    # from routes.clear_data import clear_data_bp   # Commented out if not needed
except ImportError as e:
    print(f"⚠️  Some route imports failed: {e}")
    from flask import Blueprint
    auth_bp = Blueprint('auth', __name__)
    api_bp = Blueprint('api', __name__)
    upload_bp = Blueprint('upload', __name__)
    daily_updates_bp = Blueprint('daily_updates', __name__)
    # clear_data_bp = Blueprint('clear_data', __name__)

# Import services
try:
    from services.auth_service import login_manager
    from services.websocket import socketio
except ImportError as e:
    print(f"⚠️  Some service imports failed: {e}")
    login_manager = LoginManager()
    socketio = SocketIO()

def create_app():
    """Application factory function"""
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(Config)

    # Ensure required configs are set
    app.config.setdefault('SECRET_KEY', 'dev-key-change-in-production')
    app.config.setdefault('SQLALCHEMY_TRACK_MODIFICATIONS', False)
    app.config.setdefault('UPLOAD_FOLDER', 'uploads')

    # Create necessary directories
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    os.makedirs('templates', exist_ok=True)

    # Setup logging
    log_file = os.path.join('logs', 'app.log')
    handler = RotatingFileHandler(log_file, maxBytes=10000000, backupCount=5)
    handler.setFormatter(logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    ))
    handler.setLevel(logging.INFO)
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

    # ========== CORS Configuration ==========
    # 👇 ADD YOUR NETLIFY DOMAIN HERE
    origins = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://mall-dashboard.netlify.app"   # <-- ADD THIS LINE
    ]
    CORS(app,
         resources={r"/*": {
             "origins": origins,
             "supports_credentials": True,
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
         }})

    # Initialize database
    db.init_app(app)
    app.logger.info("[OK] Database initialized")

    # Initialize login manager
    login_manager.init_app(app)
    app.logger.info("[OK] Login manager initialized")

    # Initialize socketio
    socketio.init_app(app, cors_allowed_origins="*")
    app.logger.info("[OK] SocketIO initialized")

    # ========== REGISTER BLUEPRINTS ==========
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    app.register_blueprint(daily_updates_bp, url_prefix='/api/daily')
    # app.register_blueprint(clear_data_bp, url_prefix='/api/util')  # Commented out
    app.logger.info("[OK] Blueprints registered")

    # Login manager configuration
    @login_manager.user_loader
    def load_user(user_id):
        from database.models import User
        return User.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Authentication required'}), 401

    # Root route
    @app.route('/')
    def index():
        return jsonify({
            'name': 'Mall Analytics API',
            'version': '1.0.0',
            'status': 'running',
            'timestamp': datetime.now().isoformat(),
            'endpoints': {
                'health': '/health',
                'auth': '/api/auth/login',
                'api': '/api',
                'upload': '/api/upload',
                'daily': '/api/daily'
            }
        })

    # Health check route
    @app.route('/health')
    def health_check():
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'environment': os.getenv('FLASK_ENV', 'development'),
            'database': 'unknown',
            'services': {}
        }

        try:
            with app.app_context():
                db.session.execute(text('SELECT 1')).scalar()
                health_status['database'] = 'connected'
        except Exception as e:
            health_status['database'] = f'error: {str(e)}'
            health_status['status'] = 'degraded'

        return jsonify(health_status)

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        try:
            db.session.rollback()
        except:
            pass
        app.logger.error(f"Internal server error: {error}")
        return jsonify({'error': 'Internal server error'}), 500

    app.logger.info("[OK] Application initialized successfully")
    return app

# Create application instance
app = create_app()

# Initialize database tables and admin user
with app.app_context():
    try:
        db.create_all()
        app.logger.info("[OK] Database tables created/verified")

        from database.models import User
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@mallanalytics.com',
                full_name='System Administrator',
                role='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            app.logger.info("[OK] Default admin user created")
    except Exception as e:
        app.logger.error(f"[ERROR] Database initialization error: {e}")

if __name__ == '__main__':
    print("\n" + "="*60)
    print("MALL ANALYTICS API SERVER")
    print("="*60)
    print(f"📍 Server:    http://127.0.0.1:5000")
    print(f"📊 Health:    http://127.0.0.1:5000/health")
    print(f"🔑 Login:     http://127.0.0.1:5000/api/auth/login")
    print(f"📁 Upload:    http://127.0.0.1:5000/api/upload")
    print(f"📅 Daily:     http://127.0.0.1:5000/api/daily")
    print("="*60)
    print("Press CTRL+C to quit\n")

    try:
        socketio.run(
            app,
            debug=True,
            host='127.0.0.1',
            port=5000
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        print("💡 Tip: Try running with: python app.py")