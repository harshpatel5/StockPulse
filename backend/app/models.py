# Import required libraries
from flask_sqlalchemy import SQLAlchemy
from passlib.context import CryptContext
from datetime import datetime, timezone
from sqlalchemy.orm import relationship

# Database instance (configured in main.py)
db = SQLAlchemy()

# Password hashing setup using bcrypt (industry standard)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(db.Model):
    """User table - stores user accounts"""
    __tablename__ = 'users'
    
    # Table columns
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # One user can have many assets
    assets = relationship("Asset", backref="owner", lazy=True, cascade="all, delete-orphan")
    
    def hash_password(self, password):
        """Converts plain password to secure hash"""
        self.password_hash = pwd_context.hash(password)
    
    def verify_password(self, password):
        """Checks if password matches stored hash"""
        return pwd_context.verify(password, self.password_hash)
    
    def to_dict(self):
        """Converts user data to JSON format"""
        return {
            'id': self.id,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<User {self.email}>'


class Asset(db.Model):
    """Asset table - stores stocks, crypto, ETFs"""
    __tablename__ = 'assets'
    
    # Table columns
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # Symbol (e.g., 'AAPL')
    asset_type = db.Column(db.String(50), nullable=False)  # Type (Stock, Crypto, ETF)
    quantity = db.Column(db.Float, nullable=False)  # How many shares/coins
    cost_basis = db.Column(db.Float, nullable=False)  # Total amount paid
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    def to_dict(self):
        """Converts asset data to JSON format"""
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


class PortfolioHistory(db.Model):
    """Portfolio History table - stores daily portfolio snapshots"""
    __tablename__ = "portfolio_history"

    # Table columns
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.DateTime(timezone=True), nullable=False, index=True)  # UTC timestamp of snapshot
    total_value = db.Column(db.Float, nullable=False)  # Portfolio value on that date
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Link back to user
    user = relationship("User", backref="history", lazy=True)
    
    # Prevent duplicate entries for same user and date
    __table_args__ = (
        db.UniqueConstraint('user_id', 'date', name='unique_user_date'),
        db.Index('idx_user_date', 'user_id', 'date'),  # Speed up queries
    )

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat(),
            "total_value": self.total_value,
        }
