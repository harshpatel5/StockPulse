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
FINNHUB_KEY_PLACEHOLDER = "YOUR_FINNHUB_API_KEY"

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
    if not FINNHUB_KEY or FINNHUB_KEY == FINNHUB_KEY_PLACEHOLDER:
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


def is_weekend(target_date):
    """Check if date is Saturday (5) or Sunday (6)"""
    return target_date.weekday() >= 5


def get_last_weekday_date(target_date=None):
    """
    Map weekend dates to Friday.
    If target_date is Saturday, return Friday.
    If target_date is Sunday, return Friday.
    Otherwise return target_date as-is.
    """
    from datetime import timedelta
    
    if target_date is None:
        target_date = date.today()
    
    weekday = target_date.weekday()
    if weekday == 5:  # Saturday
        return target_date - timedelta(days=1)
    elif weekday == 6:  # Sunday
        return target_date - timedelta(days=2)
    else:
        return target_date


def cleanup_old_snapshots(user_id, days=30):
    """
    Delete portfolio history snapshots older than specified days.
    Runs once per day by checking if any records were actually deleted.
    Returns number of deleted records.
    """
    from datetime import timedelta
    
    try:
        cutoff_date = date.today() - timedelta(days=days)
        
        # Delete old records
        deleted = PortfolioHistory.query.filter(
            PortfolioHistory.user_id == user_id,
            PortfolioHistory.date < cutoff_date
        ).delete()
        
        if deleted > 0:
            db.session.commit()
            logger.info(f"Cleaned up {deleted} old snapshots for user {user_id}")
        
        return deleted
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error cleaning up old snapshots: {e}")
        return 0


def generate_portfolio_chart_data(user_id, days=30):
    """
    Generate last N days of portfolio chart data from cached snapshots.
    Forward-fills weekends/holidays with last known value.
    Returns data from max(30 days ago, first snapshot date) to today.
    New users with no snapshots get a single point with value 0.
    """
    from datetime import timedelta
    
    try:
        # Clean up old snapshots (runs once per day)
        cleanup_old_snapshots(user_id, days=days)
        
        today = date.today()
        start_date = today - timedelta(days=days)
        
        # Get cached snapshots from database (last 30 days)
        cached_snapshots = PortfolioHistory.query.filter(
            PortfolioHistory.user_id == user_id,
            PortfolioHistory.date >= start_date,
            PortfolioHistory.date <= today
        ).order_by(PortfolioHistory.date.asc()).all()
        
        # If no snapshots, return single point with value 0
        if not cached_snapshots:
            return [{
                "date": today.isoformat(),
                "total_value": 0
            }]
        
        # Create dictionary of cached values
        history_dict = {snap.date: snap.total_value for snap in cached_snapshots}
        
        # Find first snapshot date (chart starts here)
        first_snapshot_date = cached_snapshots[0].date
        chart_start_date = max(first_snapshot_date, start_date)
        
        # Generate data for each day with forward-filling
        chart_data = []
        current_date = chart_start_date
        last_known_value = 0
        
        while current_date <= today:
            if current_date in history_dict:
                # We have a snapshot for this date
                value = history_dict[current_date]
                last_known_value = value
            else:
                # No snapshot (weekend/holiday/missed day) - forward fill
                value = last_known_value
            
            chart_data.append({
                "date": current_date.isoformat(),
                "total_value": value
            })
            
            current_date += timedelta(days=1)
        
        return chart_data
        
    except Exception as e:
        logger.error(f"Error generating chart data: {e}")
        return []


