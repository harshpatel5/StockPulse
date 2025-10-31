import os

class Config:
    """Application configuration from environment variables"""
    
    # Database connection string
    # Format: postgresql://username:password@host:port/database_name
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 
        'postgresql://appuser:strongpassword@localhost:5432/portfoliodb'
    )
    
    # Turn off SQLAlchemy event system
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # App secret for signing JWTs
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # JWT token expiration time (in hours)
    JWT_EXPIRATION_HOURS = 24
    
    # Flask debug mode (False in production!)
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
