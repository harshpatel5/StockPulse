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

# Common crypto symbol to CoinGecko ID mapping
CRYPTO_ID_MAP = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'SOL': 'solana',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'LTC': 'litecoin',
    'SHIB': 'shiba-inu',
    'TRX': 'tron',
    'AVAX': 'avalanche-2',
    'LINK': 'chainlink',
    'ATOM': 'cosmos',
    'UNI': 'uniswap',
    'XLM': 'stellar',
    'ALGO': 'algorand',
    'VET': 'vechain',
}


def fetch_crypto_price(symbol):
    """
    Fetch crypto price using CoinGecko API (free, no key required)
    Returns price in USD or None if fetch fails
    """
    symbol = symbol.upper().strip()
    coin_id = CRYPTO_ID_MAP.get(symbol)
    
    if not coin_id:
        # Try using symbol as coin_id directly (lowercase)
        coin_id = symbol.lower()
    
    try:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        if data and coin_id in data and 'usd' in data[coin_id]:
            return data[coin_id]['usd']
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch crypto price for {symbol}: {str(e)}")
        return None


def search_crypto(query):
    """
    Search for cryptocurrencies using CoinGecko API
    Returns list of matching coins
    """
    try:
        url = f"https://api.coingecko.com/api/v3/search?query={query}"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        results = []
        
        if data and 'coins' in data:
            for coin in data['coins'][:10]:
                results.append({
                    "symbol": coin.get('symbol', '').upper(),
                    "description": coin.get('name', ''),
                    "displaySymbol": coin.get('symbol', '').upper(),
                    "type": "crypto",
                    "id": coin.get('id', '')
                })
        
        return results
    except Exception as e:
        logger.warning(f"Failed to search crypto: {str(e)}")
        return []


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
        asset_type = (asset.asset_type or 'stock').lower()
        
        # Try to get live price based on asset type
        if asset_type in ['stock', 'etf']:
            # Stock and ETF both use Finnhub
            live_price = fetch_live_price(asset.name.strip().upper())
            if live_price:
                current_value = live_price * quantity
            else:
                # Fallback to average cost if live price unavailable
                average_cost = float(asset.cost_basis) / quantity if quantity > 0 else 0
                current_value = average_cost * quantity
        elif asset_type == 'crypto':
            # Crypto uses CoinGecko
            live_price = fetch_crypto_price(asset.name.strip().upper())
            if live_price:
                current_value = live_price * quantity
            else:
                average_cost = float(asset.cost_basis) / quantity if quantity > 0 else 0
                current_value = average_cost * quantity
        else:
            # Fallback for unknown types
            current_value = float(asset.cost_basis)
        
        total_value += current_value
    
    return total_value


def record_daily_snapshot():
    """
    Daily scheduled job: Record portfolio value snapshot for each user
    This runs once per day and creates/updates PortfolioHistory entries
    Also backfills any missing dates from the last snapshot to today
    """
    from datetime import timedelta
    
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
                
                # Backfill missing dates between last snapshot and today
                # This handles cases where the scheduler didn't run for a few days
                last_snapshot = PortfolioHistory.query.filter_by(
                    user_id=user.id
                ).order_by(PortfolioHistory.date.desc()).first()
                
                if last_snapshot and last_snapshot.date < today:
                    # Fill gaps between last snapshot and today
                    current_date = last_snapshot.date + timedelta(days=1)
                    last_value = last_snapshot.total_value
                    
                    while current_date < today:
                        # Check if this date already has a snapshot
                        existing_gap = PortfolioHistory.query.filter_by(
                            user_id=user.id,
                            date=current_date
                        ).first()
                        
                        if not existing_gap:
                            # Create snapshot with last known value (forward fill)
                            gap_snapshot = PortfolioHistory(
                                user_id=user.id,
                                date=current_date,
                                total_value=last_value
                            )
                            db.session.add(gap_snapshot)
                            logger.info(f"Backfilled snapshot for user {user.email} on {current_date}: ${last_value:.2f}")
                        
                        current_date += timedelta(days=1)
                
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to record snapshot for user {user.email}: {str(e)}")
        
        logger.info("Daily portfolio snapshot job completed successfully!")
    except Exception as e:
        logger.error(f"Error in daily snapshot job: {str(e)}")