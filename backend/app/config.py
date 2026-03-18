import os

class Config:
    """App configuration from environment variables"""
    
    # Database URL (postgres or postgresql)
    _database_url = os.environ.get(
        'DATABASE_URL', 
        'postgresql://appuser:strongpassword@stockpulse-db:5432/portfoliodb'
    )
    # Fix Render's postgres:// → postgresql://
    if _database_url.startswith('postgres://'):
        _database_url = _database_url.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = _database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # Disable event system
    
    # JWT secret key
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # JWT expiration (24 hours)
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))
    
    # Debug mode (False in production)
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

    # Redis configuration
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    PRICE_CACHE_TTL = int(os.environ.get('PRICE_CACHE_TTL', 600))  # 10 min TTL
    PRICE_REFRESH_INTERVAL = int(os.environ.get('PRICE_REFRESH_INTERVAL', 300))  # 5 min
