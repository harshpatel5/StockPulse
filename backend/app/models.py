from flask_sqlalchemy import SQLAlchemy
from passlib.context import CryptContext
from datetime import datetime
from sqlalchemy.orm import relationship

# Initialize SQLAlchemy (configured in main.py)
db = SQLAlchemy()

# Password hashing configuration using bcrypt
# bcrypt is industry-standard for password security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(db.Model):
    """
    User model - represents registered users
    Each user can have multiple assets (one-to-many relationship)
    """
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship: One user has many assets
    # 'cascade' means when user is deleted, their assets are deleted too
    assets = relationship("Asset", backref="owner", lazy=True, cascade="all, delete-orphan")
    
    def hash_password(self, password):
        """Hash a plain-text password using bcrypt"""
        self.password_hash = pwd_context.hash(password)
    
    def verify_password(self, password):
        """Check if provided password matches the hash"""
        return pwd_context.verify(password, self.password_hash)
    
    def to_dict(self):
        """Convert user object to dictionary (for API responses)"""
        return {
            'id': self.id,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<User {self.email}>'


class Asset(db.Model):
    """
    Asset model - represents investments (stocks, crypto, etc.)
    Each asset belongs to one user (many-to-one relationship)
    """
    __tablename__ = 'assets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # e.g., 'AAPL', 'Bitcoin'
    asset_type = db.Column(db.String(50), nullable=False)  # e.g., 'Stock', 'Crypto'
    quantity = db.Column(db.Float, nullable=False)  # Number of units
    cost_basis = db.Column(db.Float, nullable=False)  # Total purchase price
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert asset object to dictionary (for API responses)"""
        return {
            'id': self.id,
            'name': self.name,
            'type': self.asset_type,
            'quantity': self.quantity,
            'cost_basis': self.cost_basis,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Asset {self.name}>'
