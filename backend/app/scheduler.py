"""
Price fetching and portfolio calculations
Handles API calls to Finnhub (stocks) and CoinGecko (crypto)
Uses Redis for shared price caching across all users
"""
# Import required libraries
from datetime import date, datetime, timezone, timedelta
from app.models import db, User, Asset, PortfolioHistory
from app import redis_cache
import requests
import logging
import os

logger = logging.getLogger(__name__)

# Get API key from environment variables
FINNHUB_KEY = os.getenv('FINNHUB_KEY', '')
FINNHUB_KEY_PLACEHOLDER = "YOUR_FINNHUB_API_KEY"

# Cache TTL from environment (default 10 min)
PRICE_CACHE_TTL = int(os.environ.get('PRICE_CACHE_TTL', 600))

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


def fetch_crypto_price(symbol):
    """Get crypto price — checks Redis first, then calls CoinGecko API."""
    symbol = symbol.upper().strip()

    # Check Redis cache first
    cache_key = f"crypto:{symbol}"
    cached_price = redis_cache.get_price(cache_key)
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
            redis_cache.set_price(cache_key, price, ttl=PRICE_CACHE_TTL)
            logger.debug(f"Fetched and cached {symbol}: ${price}")
            return price
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch crypto price for {symbol}: {str(e)}")
        return None


def fetch_crypto_prices_batch(symbols):
    """Batch fetch crypto prices from CoinGecko (supports multi-ID in one call)."""
    if not symbols:
        return {}

    # Map symbols to CoinGecko IDs
    coin_ids = {}
    for symbol in symbols:
        symbol = symbol.upper().strip()
        coin_id = CRYPTO_ID_MAP.get(symbol, symbol.lower())
        coin_ids[coin_id] = symbol

    try:
        ids_param = ','.join(coin_ids.keys())
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids_param}&vs_currencies=usd"
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()
        prices = {}
        for coin_id, symbol in coin_ids.items():
            if coin_id in data and 'usd' in data[coin_id]:
                prices[symbol] = data[coin_id]['usd']

        return prices
    except Exception as e:
        logger.warning(f"Batch crypto fetch failed: {str(e)}")
        return {}


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
    """Get stock price — checks Redis first, then calls Finnhub API."""
    # Check Redis cache first
    cache_key = f"stock:{symbol}"
    cached_price = redis_cache.get_price(cache_key)
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
                redis_cache.set_price(cache_key, price, ttl=PRICE_CACHE_TTL)
                logger.debug(f"Fetched and cached {symbol}: ${price}")
                return price
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch price for {symbol}: {str(e)}")
        return None


# =========================================================================
# SECTOR DATA - Fetch company profile for diversification analysis
# =========================================================================

SECTOR_CACHE_TTL = 86400  # 24 hours — sectors rarely change

def fetch_sector_data(symbol):
    """Get company sector/industry from Finnhub. Cached in Redis for 24h."""
    symbol = symbol.strip().upper()
    cache_key = f"sector:{symbol}"

    # Check Redis cache first
    cached = redis_cache.get_price(cache_key)
    if cached is not None:
        # Stored as "sector|industry|name" string
        parts = str(cached).split('|')
        if len(parts) == 3:
            return {"sector": parts[0], "industry": parts[1], "name": parts[2]}

    if not FINNHUB_KEY or FINNHUB_KEY == FINNHUB_KEY_PLACEHOLDER:
        return None

    try:
        url = f"https://finnhub.io/api/v1/stock/profile2?symbol={symbol}&token={FINNHUB_KEY}"
        response = requests.get(url, timeout=5)
        response.raise_for_status()

        data = response.json()
        if data and data.get('finnhubIndustry'):
            sector = data.get('finnhubIndustry', 'Unknown')
            industry = data.get('finnhubIndustry', 'Unknown')
            name = data.get('name', symbol)

            # Store as pipe-delimited string in Redis (reuses price cache infra)
            cache_value = f"{sector}|{industry}|{name}"
            redis_cache.set_price(cache_key, cache_value, ttl=SECTOR_CACHE_TTL)

            return {"sector": sector, "industry": industry, "name": name}
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch sector data for {symbol}: {str(e)}")
        return None


def fetch_sectors_batch(symbols):
    """Fetch sector data for multiple symbols in parallel."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    results = {}
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_map = {executor.submit(fetch_sector_data, s): s for s in symbols}
        for future in as_completed(future_map):
            symbol = future_map[future]
            try:
                result = future.result()
                if result:
                    results[symbol] = result
            except Exception:
                pass
    return results


# =========================================================================
# BULK REFRESH - Background job to pre-cache ALL user tickers
# =========================================================================

def get_all_unique_tickers():
    """Query DB for all distinct tickers across ALL users, grouped by type."""
    stocks = set()
    cryptos = set()

    try:
        assets = db.session.query(Asset.name, Asset.asset_type).distinct().all()
        for name, asset_type in assets:
            symbol = name.strip().upper()
            asset_type_lower = (asset_type or 'stock').lower()
            if asset_type_lower in ('stock', 'etf'):
                stocks.add(symbol)
            elif asset_type_lower == 'crypto':
                cryptos.add(symbol)
    except Exception as e:
        logger.error(f"Failed to query unique tickers: {e}")

    return {"stocks": list(stocks), "crypto": list(cryptos)}


def refresh_all_prices():
    """Background job: fetch prices for ALL tickers and store in Redis."""
    tickers = get_all_unique_tickers()
    stocks = tickers["stocks"]
    cryptos = tickers["crypto"]

    if not stocks and not cryptos:
        logger.info("No tickers to refresh.")
        return

    all_prices = {}

    # Fetch stock prices (one by one via Finnhub — no batch endpoint)
    for symbol in stocks:
        try:
            if not FINNHUB_KEY or FINNHUB_KEY == FINNHUB_KEY_PLACEHOLDER:
                break
            url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={FINNHUB_KEY}"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            if data and 'c' in data:
                price = data['c']
                if isinstance(price, (int, float)) and price > 0:
                    all_prices[f"stock:{symbol}"] = price
        except Exception as e:
            logger.warning(f"Refresh: failed to fetch {symbol}: {e}")

    # Fetch crypto prices in batch (CoinGecko supports multi-ID)
    if cryptos:
        crypto_prices = fetch_crypto_prices_batch(cryptos)
        for symbol, price in crypto_prices.items():
            all_prices[f"crypto:{symbol}"] = price

    # Store all in Redis
    if all_prices:
        redis_cache.set_all_prices(all_prices, ttl=PRICE_CACHE_TTL)

    logger.info(f"Refreshed {len(stocks)} stock + {len(cryptos)} crypto prices ({len(all_prices)} total cached)")


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
    Returns both raw values and cash-flow-adjusted growth series.
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

        # New user with no history
        if not cached_snapshots:
            today_midnight_utc = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
            empty_point = {"date": today_midnight_utc.isoformat(), "total_value": 0}
            return {"raw": [empty_point], "growth": [{"date": today_midnight_utc.isoformat(), "value": 0}]}

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

        # Generate cash-flow-adjusted growth series
        growth = generate_growth_series(user_id, chart_data, start_datetime, end_datetime)

        return {"raw": chart_data, "growth": growth}

    except Exception as e:
        logger.error(f"Error generating chart data: {e}")
        return {"raw": [], "growth": []}


def generate_growth_series(user_id, raw_chart_data, start_datetime, end_datetime):
    """
    Build a cash-flow-adjusted growth line using Modified Dietz daily method.
    Strips out capital inflows/outflows so the chart shows only market performance.
    """
    from app.models import CashFlow

    if not raw_chart_data:
        return []

    # Get all cash flows in date range
    flows = CashFlow.query.filter(
        CashFlow.user_id == user_id,
        CashFlow.date >= start_datetime,
        CashFlow.date <= end_datetime
    ).order_by(CashFlow.date.asc()).all()

    # Build date -> sum of cash flows dict
    flow_dict = {}
    for flow in flows:
        d = flow.date.date()
        flow_dict[d] = flow_dict.get(d, 0.0) + float(flow.amount)

    # Build growth series from raw chart data
    growth_series = []
    growth_value = None
    prev_day_value = None

    for point in raw_chart_data:
        date_str = point["date"]
        today_value = float(point["total_value"])
        current_date = datetime.fromisoformat(date_str).date()
        today_flows = flow_dict.get(current_date, 0.0)

        if growth_value is None:
            # First day: initialize growth to actual value
            growth_value = today_value
        else:
            # Calculate return excluding cash flows
            if prev_day_value and prev_day_value > 0:
                daily_return = (today_value - today_flows) / prev_day_value - 1.0
                # Clamp extreme returns for safety
                daily_return = max(-0.99, min(daily_return, 10.0))
            else:
                daily_return = 0.0

            growth_value = growth_value * (1.0 + daily_return)

        prev_day_value = today_value

        growth_series.append({
            "date": date_str,
            "value": round(growth_value, 2)
        })

    return growth_series


# =========================================================================
# CRON JOB - Daily Portfolio Snapshots
# =========================================================================

def snapshot_all_users_portfolios():
    """
    Cron job: Take daily snapshot of all users' portfolios.
    Runs automatically at midnight UTC.
    """
    from flask import current_app

    logger.info("Starting daily portfolio snapshot job...")

    try:
        # Get all users with assets
        users_with_assets = db.session.query(User.id).join(Asset).distinct().all()

        if not users_with_assets:
            logger.info("No users with assets found. Skipping snapshot.")
            return

        now_utc = datetime.now(timezone.utc)
        today_date = get_last_weekday_date(now_utc.date())

        # Start and end of today for checking existing snapshots
        start_of_day = datetime.combine(today_date, datetime.min.time(), tzinfo=timezone.utc)
        end_of_day = datetime.combine(today_date, datetime.max.time(), tzinfo=timezone.utc)

        success_count = 0
        skip_count = 0
        error_count = 0

        for (user_id,) in users_with_assets:
            try:
                # Check if snapshot already exists for today
                existing = PortfolioHistory.query.filter(
                    PortfolioHistory.user_id == user_id,
                    PortfolioHistory.date >= start_of_day,
                    PortfolioHistory.date <= end_of_day
                ).first()

                if existing:
                    skip_count += 1
                    continue

                # Calculate portfolio value
                total_value = calculate_user_portfolio_value(user_id)

                # Create snapshot
                snapshot = PortfolioHistory(
                    user_id=user_id,
                    date=now_utc,
                    total_value=total_value
                )
                db.session.add(snapshot)
                db.session.commit()

                success_count += 1
                logger.debug(f"Snapshot created for user {user_id}: ${total_value:.2f}")

            except Exception as e:
                db.session.rollback()
                error_count += 1
                logger.error(f"Failed to snapshot user {user_id}: {e}")

        logger.info(f"Daily snapshot complete: {success_count} created, {skip_count} skipped, {error_count} errors")

    except Exception as e:
        logger.error(f"Daily snapshot job failed: {e}")


def init_scheduler(app):
    """Initialize APScheduler for background jobs"""
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger

    refresh_interval = int(os.environ.get('PRICE_REFRESH_INTERVAL', 300))

    scheduler = BackgroundScheduler()

    # Run daily at midnight UTC
    scheduler.add_job(
        func=lambda: run_with_app_context(app, snapshot_all_users_portfolios),
        trigger=CronTrigger(hour=0, minute=0, timezone='UTC'),
        id='daily_portfolio_snapshot',
        name='Daily Portfolio Snapshot',
        replace_existing=True
    )

    # Refresh all prices every 5 minutes
    scheduler.add_job(
        func=lambda: run_with_app_context(app, refresh_all_prices),
        trigger=IntervalTrigger(seconds=refresh_interval),
        id='refresh_all_prices',
        name='Refresh All Prices',
        replace_existing=True
    )

    scheduler.start()
    logger.info(f"Scheduler started: Daily snapshots at midnight UTC, price refresh every {refresh_interval}s")

    # Warm cache on startup
    try:
        with app.app_context():
            refresh_all_prices()
    except Exception as e:
        logger.warning(f"Initial price refresh failed (will retry in {refresh_interval}s): {e}")

    return scheduler


def run_with_app_context(app, func):
    """Run a function within Flask app context"""
    with app.app_context():
        func()
