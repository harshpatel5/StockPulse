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
    
    # Connection pooling - reuse DB connections for faster queries
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 5,           # Keep 5 connections ready
        'pool_recycle': 300,      # Recycle connections after 5 min
        'pool_pre_ping': True,    # Check connection health before use
        'max_overflow': 10,       # Allow 10 extra connections during peak
    }
    
    # JWT secret key
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # JWT expiration (24 hours)
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))
    
    # Debug mode (False in production)
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
