"""
Price fetching and portfolio calculations
Handles API calls to Finnhub (stocks) and CoinGecko (crypto)
"""
# Import required libraries
from datetime import date, datetime, timezone, timedelta
from app.models import db, User, Asset, PortfolioHistory
import requests
import logging
import os

logger = logging.getLogger(__name__)

# Get API key from environment variables
FINNHUB_KEY = os.getenv('FINNHUB_KEY', '')
FINNHUB_KEY_PLACEHOLDER = "YOUR_FINNHUB_API_KEY"

# Map crypto symbols to CoinGecko IDs
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


# =========================================================================
# CACHING SYSTEM - Reduces API calls
# =========================================================================

class SimpleCache:
    """Cache to store prices temporarily (60 seconds)"""
    def __init__(self):
        self._cache = {}
    
    def get(self, key):
        """Check if we have a cached price that's still valid"""
        if key in self._cache:
            value, expiry = self._cache[key]
            if datetime.now(timezone.utc) < expiry:
                return value
            # Price is old, remove it
            del self._cache[key]
        return None
    
    def set(self, key, value, ttl_seconds=60):
        """Store price in cache for 60 seconds"""
        expiry = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
        self._cache[key] = (value, expiry)
    
    def clear(self):
        """Delete all cached prices"""
        self._cache.clear()
    
    def size(self):
        """Count how many prices are cached"""
        return len(self._cache)


# Create cache instance
_price_cache = SimpleCache()


def fetch_crypto_price(symbol):
    """Get crypto price from CoinGecko API (free, no key needed)"""
    symbol = symbol.upper().strip()
    
    # Check cache first (avoids API call)
    cache_key = f"crypto:{symbol}"
    cached_price = _price_cache.get(cache_key)
    if cached_price is not None:
        logger.debug(f"Cache hit for {symbol}: ${cached_price}")
        return cached_price
    
    # Get CoinGecko ID (e.g., 'BTC' → 'bitcoin')
    coin_id = CRYPTO_ID_MAP.get(symbol)
    if not coin_id:
        coin_id = symbol.lower()  # Try symbol directly
    
    try:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        if data and coin_id in data and 'usd' in data[coin_id]:
            price = data[coin_id]['usd']
            _price_cache.set(cache_key, price, ttl_seconds=60)  # Cache for 60 sec
            logger.debug(f"Fetched and cached {symbol}: ${price}")
            return price
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch crypto price for {symbol}: {str(e)}")
        return None


def search_crypto(query):
    """Search for crypto coins on CoinGecko (returns top 10 matches)"""
    try:
        url = f"https://api.coingecko.com/api/v3/search?query={query}"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        results = []
        
        if data and 'coins' in data:
            for coin in data['coins'][:10]:  # Only top 10 results
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
    """Get stock price from Finnhub API (requires API key)"""
    # Check cache first (avoids API call)
    cache_key = f"stock:{symbol}"
    cached_price = _price_cache.get(cache_key)
    if cached_price is not None:
        logger.debug(f"Cache hit for {symbol}: ${cached_price}")
        return cached_price
    
    # No API key configured
    if not FINNHUB_KEY or FINNHUB_KEY == FINNHUB_KEY_PLACEHOLDER:
        return None
    
    try:
        url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={FINNHUB_KEY}"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        if data and 'c' in data:  # 'c' = current price
            price = data['c']
            if isinstance(price, (int, float)) and price > 0:
                _price_cache.set(cache_key, price, ttl_seconds=60)  # Cache for 60 sec
                logger.debug(f"Fetched and cached {symbol}: ${price}")
                return price
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch price for {symbol}: {str(e)}")
        return None


def calculate_user_portfolio_value(user_id):
    """Calculate total portfolio value using live prices (fallback to cost_basis if unavailable)"""
    assets = Asset.query.filter_by(user_id=user_id).all()
    
    if not assets:
        return 0.0
    
    total_value = 0.0
    
    for asset in assets:
        quantity = float(asset.quantity)
        asset_type = (asset.asset_type or 'stock').lower()
        
        # Try to get live price based on type
        if asset_type in ['stock', 'etf']:
            live_price = fetch_live_price(asset.name.strip().upper())
            if live_price:
                current_value = live_price * quantity
            else:
                # Use cost_basis if API fails
                average_cost = float(asset.cost_basis) / quantity if quantity > 0 else 0
                current_value = average_cost * quantity
        elif asset_type == 'crypto':
            live_price = fetch_crypto_price(asset.name.strip().upper())
            if live_price:
                current_value = live_price * quantity
            else:
                average_cost = float(asset.cost_basis) / quantity if quantity > 0 else 0
                current_value = average_cost * quantity
        else:
            # Unknown type - use cost_basis
            current_value = float(asset.cost_basis)
        
        total_value += current_value
    
    return total_value


def is_weekend(target_date):
    """Check if date is Saturday (5) or Sunday (6)"""
    return target_date.weekday() >= 5


def get_last_weekday_date(target_date=None):
    """Map weekends to Friday (e.g., Sat/Sun → Fri)"""
    if target_date is None:
        target_date = datetime.now(timezone.utc).date()
    
    weekday = target_date.weekday()
    if weekday == 5:  # Saturday
        return target_date - timedelta(days=1)
    elif weekday == 6:  # Sunday
        return target_date - timedelta(days=2)
    else:
        return target_date


def cleanup_old_snapshots(user_id, days=30):
    """Delete portfolio snapshots older than X days (default 30)"""
    try:
        cutoff_datetime = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Delete old snapshots
        deleted = PortfolioHistory.query.filter(
            PortfolioHistory.user_id == user_id,
            PortfolioHistory.date < cutoff_datetime
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
    Generate chart data from DB snapshots (last 30 days).
    Forward-fills missing days with last known value.
    """
    try:
        # Delete old snapshots first
        cleanup_old_snapshots(user_id, days=days)
        
        now_utc = datetime.now(timezone.utc)
        today = now_utc.date()
        start_date = today - timedelta(days=days)
        start_datetime = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        end_datetime = now_utc
        
        # Get snapshots from DB (now using datetime field)
        cached_snapshots = PortfolioHistory.query.filter(
            PortfolioHistory.user_id == user_id,
            PortfolioHistory.date >= start_datetime,
            PortfolioHistory.date <= end_datetime
        ).order_by(PortfolioHistory.date.asc()).all()
        
        # New user with no history - return today's date at midnight UTC
        if not cached_snapshots:
            today_midnight_utc = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
            return [{"date": today_midnight_utc.isoformat(), "total_value": 0}]
        
        # Build dictionary of dates → values (extract date from datetime)
        history_dict = {snap.date.date(): snap.total_value for snap in cached_snapshots}
        
        # Chart starts at first snapshot (or 30 days ago, whichever is later)
        first_snapshot_date = cached_snapshots[0].date.date()
        chart_start_date = max(first_snapshot_date, start_date)
        
        # Fill in all days with forward-filling
        chart_data = []
        current_date = chart_start_date
        last_known_value = 0
        
        while current_date <= today:
            if current_date in history_dict:
                value = history_dict[current_date]  # Real snapshot
                last_known_value = value
            else:
                value = last_known_value  # Forward-fill missing day
            
            # Return ISO format with timezone (midnight UTC for that date)
            date_utc = datetime.combine(current_date, datetime.min.time(), tzinfo=timezone.utc)
            chart_data.append({
                "date": date_utc.isoformat(),
                "total_value": value
            })
            
            current_date += timedelta(days=1)
        
        return chart_data
        
    except Exception as e:
        logger.error(f"Error generating chart data: {e}")
        return []


