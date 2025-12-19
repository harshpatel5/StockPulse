import os

class Config:
    """Application configuration from environment variables"""
    
    # Database connection string
    # Format: postgresql://username:password@host:port/database_name
    # Note: Render uses postgres:// but SQLAlchemy requires postgresql://
    _database_url = os.environ.get(
        'DATABASE_URL', 
        'postgresql://appuser:strongpassword@stockpulse-db:5432/portfoliodb'
    )
    # Fix for Render: replace postgres:// with postgresql://
    if _database_url.startswith('postgres://'):
        _database_url = _database_url.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = _database_url
    
    # Turn off SQLAlchemy event system
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # App secret for signing JWTs
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # JWT token expiration time (in minutes)
    JWT_EXPIRATION_MIN = int(os.environ.get('JWT_EXPIRATION_MIN', 3))
    
    # Flask debug mode (False in production!)
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
