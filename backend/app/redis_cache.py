"""
Redis-based price cache for storing live asset prices.
Provides graceful fallback — if Redis is down, returns None (never crashes).
"""
import redis
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Redis client (initialized lazily)
_redis_client = None
_last_refresh_time = None


def _get_redis():
    """Get or create Redis client connection."""
    global _redis_client
    if _redis_client is None:
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
        try:
            _redis_client = redis.from_url(redis_url, decode_responses=True, socket_timeout=3)
            _redis_client.ping()
            logger.info("Connected to Redis")
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}")
            _redis_client = None
    return _redis_client


def get_price(symbol):
    """Get a single cached price from Redis. Returns float or None."""
    try:
        client = _get_redis()
        if client is None:
            return None
        value = client.get(f"price:{symbol}")
        if value is not None:
            return float(value)
        return None
    except Exception as e:
        logger.warning(f"Redis GET failed for {symbol}: {e}")
        return None


def set_price(symbol, price, ttl=600):
    """Store a single price in Redis with TTL."""
    try:
        client = _get_redis()
        if client is None:
            return
        client.setex(f"price:{symbol}", ttl, str(price))
    except Exception as e:
        logger.warning(f"Redis SET failed for {symbol}: {e}")


def get_all_prices(symbols):
    """Batch get prices from Redis using MGET. Returns dict of symbol->float."""
    if not symbols:
        return {}
    try:
        client = _get_redis()
        if client is None:
            return {}
        keys = [f"price:{s}" for s in symbols]
        values = client.mget(keys)
        result = {}
        for symbol, value in zip(symbols, values):
            if value is not None:
                result[symbol] = float(value)
        return result
    except Exception as e:
        logger.warning(f"Redis MGET failed: {e}")
        return {}


def set_all_prices(price_dict, ttl=600):
    """Batch store prices in Redis using pipeline."""
    global _last_refresh_time
    if not price_dict:
        return
    try:
        client = _get_redis()
        if client is None:
            return
        pipe = client.pipeline()
        for symbol, price in price_dict.items():
            pipe.setex(f"price:{symbol}", ttl, str(price))
        pipe.execute()
        _last_refresh_time = datetime.now(timezone.utc)
    except Exception as e:
        logger.warning(f"Redis pipeline SET failed: {e}")


def get_last_refresh_time():
    """Return the last time prices were refreshed."""
    return _last_refresh_time


def is_available():
    """Check if Redis is reachable."""
    try:
        client = _get_redis()
        if client is None:
            return False
        client.ping()
        return True
    except Exception:
        return False
