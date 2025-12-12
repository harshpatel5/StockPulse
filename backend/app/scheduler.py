"""
Scheduled jobs for StockPulse backend
Handles daily portfolio value snapshots for all users
"""
from datetime import date
from app.models import db, User, Asset, PortfolioHistory
import requests
import logging
import os

logger = logging.getLogger(__name__)

# Finnhub API configuration - update this with your API key
FINNHUB_KEY = os.getenv('FINNHUB_KEY', '')


def fetch_live_price(symbol):
    """
    Fetch live price for a symbol using Finnhub API
    Returns the closing price or None if fetch fails
    """
    if not FINNHUB_KEY or FINNHUB_KEY == "YOUR_FINNHUB_API_KEY":
        return None
    
    try:
        url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={FINNHUB_KEY}"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        if data and 'c' in data:
            price = data['c']
            if isinstance(price, (int, float)) and price > 0:
                return price
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch price for {symbol}: {str(e)}")
        return None


def calculate_user_portfolio_value(user_id):
    """
    Calculate total portfolio value for a user using live prices
    Falls back to cost_basis if live price unavailable
    """
    assets = Asset.query.filter_by(user_id=user_id).all()
    
    if not assets:
        return 0.0
    
    total_value = 0.0
    
    for asset in assets:
        quantity = float(asset.quantity)
        
        # Try to get live price first
        if asset.asset_type and asset.asset_type.lower() == 'stock':
            live_price = fetch_live_price(asset.name.strip().upper())
            if live_price:
                current_value = live_price * quantity
            else:
                # Fallback to average cost if live price unavailable
                average_cost = float(asset.cost_basis) / quantity if quantity > 0 else 0
                current_value = average_cost * quantity
        else:
            # For non-stocks (crypto, etc.), use cost_basis
            current_value = float(asset.cost_basis)
        
        total_value += current_value
    
    return total_value


def record_daily_snapshot():
    """
    Daily scheduled job: Record portfolio value snapshot for each user
    This runs once per day and creates/updates PortfolioHistory entries
    """
    try:
        logger.info("Starting daily portfolio snapshot job...")
        today = date.today()
        
        # Get all users
        users = User.query.all()
        
        for user in users:
            try:
                # Calculate current portfolio value using real live prices
                total_value = calculate_user_portfolio_value(user.id)
                
                # Check if today's snapshot already exists
                existing = PortfolioHistory.query.filter_by(
                    user_id=user.id,
                    date=today
                ).first()
                
                if existing:
                    # Update existing snapshot with current live prices
                    existing.total_value = total_value
                    logger.info(f"Updated snapshot for user {user.email}: ${total_value:.2f}")
                else:
                    # Create new snapshot for today
                    snapshot = PortfolioHistory(
                        user_id=user.id,
                        date=today,
                        total_value=total_value
                    )
                    db.session.add(snapshot)
                    logger.info(f"Created snapshot for user {user.email}: ${total_value:.2f}")
                
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to record snapshot for user {user.email}: {str(e)}")
        
        logger.info("Daily portfolio snapshot job completed successfully!")
    except Exception as e:
        logger.error(f"Error in daily snapshot job: {str(e)}")