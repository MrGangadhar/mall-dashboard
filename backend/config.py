import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import urllib.parse

class Config:
    # Get the absolute path of the backend directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Database - Use MySQL if DB_* env vars are present, or DATABASE_URL, or fallback to SQLite
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '3306')
    db_name = os.getenv('DB_NAME')
    
    database_url_env = os.getenv('DATABASE_URL')
    
    if database_url_env and database_url_env.startswith('mysql'):
        SQLALCHEMY_DATABASE_URI = database_url_env
    elif db_user and db_password and db_name:
        encoded_password = urllib.parse.quote_plus(db_password)
        SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{db_user}:{encoded_password}@{db_host}:{db_port}/{db_name}"
    elif database_url_env:
        _db_url = database_url_env
        if _db_url.startswith('postgresql://'):
            _db_url = _db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
        SQLALCHEMY_DATABASE_URI = _db_url
    else:
        SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(BASE_DIR, "app.db")}'
        
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'sslmode': 'require'} if 'neon.tech' in SQLALCHEMY_DATABASE_URI else {}
    }
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