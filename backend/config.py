import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    # Get the absolute path of the backend directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Database - Use SQLite for initial testing if MySQL not available
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL', 
        f'sqlite:///{os.path.join(BASE_DIR, "app.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # File Upload
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
    
    # Session & Auth
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    SESSION_TYPE = 'filesystem'  # Use filesystem for Windows
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Cache settings
    CACHE_TYPE = 'simple'  # Use simple cache for Windows
    CACHE_DEFAULT_TIMEOUT = 300
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.path.join(BASE_DIR, 'logs', 'app.log')
    
    # Application Settings
    MAX_BRANDS_PER_MONTH = 200
    TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'templates')