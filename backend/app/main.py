# Import required libraries
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.auth import generate_token, token_required
from app.models import db, User, Asset, PortfolioHistory, CashFlow
from app.config import Config
from sqlalchemy import exc, func
from datetime import date, datetime, timedelta, timezone
from app.scheduler import (
    fetch_live_price,
    fetch_crypto_price,
    search_crypto,
    calculate_user_portfolio_value,
    generate_portfolio_chart_data,
    get_last_weekday_date,
    init_scheduler,
    fetch_sectors_batch,
    generate_recommendations,
    FINNHUB_KEY,
    FINNHUB_KEY_PLACEHOLDER
)
from app import redis_cache
import requests
import os
import logging
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed

# Setup logging
logger = logging.getLogger(__name__)


def create_app(config_class=Config):
    """Creates and configures the Flask application"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Allow frontend to make requests to backend
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Rate limiter prevents spam and abuse
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["30 per day", "10 per hour"],
        storage_uri="memory://"
    )
    
    # Setup database connection
    db.init_app(app)
    
    # Create database tables if they don't exist yet
    with app.app_context():
        db.create_all()
        print("✓ Database tables created successfully!")
        
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        print("✓ On-demand chart generation enabled!")
    
    # Initialize background scheduler for daily snapshots
    # Only start scheduler in main process (not in reloader)
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        init_scheduler(app)
    
    # Helper function to check if API key is configured
    def check_finnhub_key():
        """Returns True if API key is valid, False otherwise"""
        if not FINNHUB_KEY or FINNHUB_KEY == FINNHUB_KEY_PLACEHOLDER:
            return False, {"message": "Finnhub API key not configured on server"}
        return True, None
    
    # =========================================================================
    # API ROUTES START HERE
    # =========================================================================
    
    @app.route('/api/status', methods=['GET'])
    @limiter.exempt
    def get_status():
        """Health check endpoint"""
        return jsonify({
            "status": "online",
            "message": "StockPulse API is running",
            "version": "1.0.0"
        }), 200
    
    # =========================================================================
    # AUTHENTICATION ROUTES
    # =========================================================================
    
    @app.route('/api/me', methods=['GET'])
    @token_required
    @limiter.limit("1000 per hour")
    def me(current_user):
        """Get current authenticated user info"""
        if not current_user:
            return jsonify({"message": "User not found"}), 404
                                        
        return jsonify({
            "user": current_user.to_dict()
        }), 200

    @app.route('/api/register', methods=['POST'])
    @limiter.limit("3 per hour")  # Prevent spam registrations
    def register():
        """
        Register a new user
        Request body: {"email": "user@example.com", "password": "secure123"}
        """
        try:
            data = request.get_json()
            
            # Validate input
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                return jsonify({"message": "Email and password are required"}), 400
            
            # Check if user already exists
            if User.query.filter_by(email=email).first():
                return jsonify({"message": "User already exists"}), 409
            
            # Create new user
            new_user = User(email=email)
            new_user.hash_password(password)
            
            db.session.add(new_user)
            db.session.commit()
            
            return jsonify({
                "message": "User registered successfully",
                "user": new_user.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({"message": f"Registration error: {str(e)}"}), 500
    
    @app.route('/api/login', methods=['POST'])
    @limiter.limit("100 per hour")  # Increased for development
    def login():
        """
        Login user and return JWT token
        Request body: {"email": "user@example.com", "password": "secure123"}
        """
        try:
            data = request.get_json()
            
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                return jsonify({"message": "Email and password are required"}), 400
            
            # Find user
            user = User.query.filter_by(email=email).first()
            
            # Verify password
            if user and user.verify_password(password):
                token = generate_token(user.id)
                
                return jsonify({
                    "message": "Login successful",
                    "token": token,
                    "user": user.to_dict()
                }), 200
            
            return jsonify({"message": "Invalid email or password"}), 401
            
        except Exception as e:
            return jsonify({"message": f"Login error: {str(e)}"}), 500
    
    # -------------------------------------------------------------------------
    # ASSET ROUTES (Protected - Require Authentication)
    # -------------------------------------------------------------------------
    
    @app.route('/api/assets', methods=['GET', 'POST'])
    @limiter.limit("200 per hour")  # Increased temporarily to avoid accidental 429s
    @token_required
    def manage_assets(current_user):
        """
        GET: Retrieve all assets for current user
        POST: Create a new asset
        """
        if request.method == 'GET':
            try:
                assets = Asset.query.filter_by(user_id=current_user.id).all()
                return jsonify([asset.to_dict() for asset in assets]), 200
            except Exception as e:
                return jsonify({"message": f"Error fetching assets: {str(e)}"}), 500
        
        elif request.method == 'POST':
            try:
                data = request.get_json()
                
                # Validate required fields
                name = data.get('name')
                asset_type = data.get('type')
                quantity = data.get('quantity')
                cost_basis = data.get('cost_basis')
                
                if not all([name, asset_type, quantity is not None, cost_basis is not None]):
                    return jsonify({
                        "message": "Missing required fields: name, type, quantity, cost_basis"
                    }), 400
                
                # Create new asset
                new_asset = Asset(
                    name=name,
                    asset_type=asset_type,
                    quantity=float(quantity),
                    cost_basis=float(cost_basis),
                    user_id=current_user.id
                )
                
                db.session.add(new_asset)
                db.session.commit()

                # Record capital inflow
                cash_flow = CashFlow(
                    user_id=current_user.id,
                    date=datetime.now(timezone.utc),
                    amount=float(cost_basis),
                    flow_type='add',
                    asset_name=name,
                    notes=f"Added {quantity} units of {name}"
                )
                db.session.add(cash_flow)
                db.session.commit()

                return jsonify({
                    "message": "Asset created successfully",
                    "asset": new_asset.to_dict()
                }), 201
                
            except ValueError:
                return jsonify({"message": "Quantity and cost_basis must be numbers"}), 400
            except exc.SQLAlchemyError as e:
                db.session.rollback()
                return jsonify({"message": f"Database error: {str(e)}"}), 500
            except Exception as e:
                return jsonify({"message": f"Error creating asset: {str(e)}"}), 500
    
    @app.route('/api/assets/<int:asset_id>', methods=['GET', 'PUT', 'DELETE'])
    @limiter.limit("30 per hour")
    @token_required
    def manage_single_asset(current_user, asset_id):
        """
        GET: Get single asset
        PUT: Update asset
        DELETE: Delete asset
        """
        # Find asset and verify ownership
        asset = Asset.query.filter_by(id=asset_id, user_id=current_user.id).first()
        
        if not asset:
            return jsonify({"message": "Asset not found or access denied"}), 404
        
        if request.method == 'GET':
            return jsonify(asset.to_dict()), 200
        
        elif request.method == 'PUT':
            try:
                data = request.get_json()
                old_cost_basis = float(asset.cost_basis)

                # Update fields if provided
                if 'name' in data:
                    asset.name = data['name']
                if 'type' in data:
                    asset.asset_type = data['type']
                if 'quantity' in data:
                    asset.quantity = float(data['quantity'])
                if 'cost_basis' in data:
                    asset.cost_basis = float(data['cost_basis'])

                db.session.commit()

                # Record capital flow if cost_basis changed
                delta = float(asset.cost_basis) - old_cost_basis
                if abs(delta) > 0.01:
                    cash_flow = CashFlow(
                        user_id=current_user.id,
                        date=datetime.now(timezone.utc),
                        amount=delta,
                        flow_type='update',
                        asset_name=asset.name,
                        notes=f"Updated {asset.name}: cost_basis changed by {delta:+.2f}"
                    )
                    db.session.add(cash_flow)
                    db.session.commit()

                return jsonify({
                    "message": "Asset updated successfully",
                    "asset": asset.to_dict()
                }), 200
                
            except ValueError:
                return jsonify({"message": "Quantity and cost_basis must be numbers"}), 400
            except exc.SQLAlchemyError as e:
                db.session.rollback()
                return jsonify({"message": f"Database error: {str(e)}"}), 500
        
        elif request.method == 'DELETE':
            try:
                # Accept optional current_value for accurate outflow tracking
                data = request.get_json() or {}
                outflow_amount = float(data.get('current_value', asset.cost_basis))

                # Record capital outflow before deleting
                cash_flow = CashFlow(
                    user_id=current_user.id,
                    date=datetime.now(timezone.utc),
                    amount=-outflow_amount,
                    flow_type='remove',
                    asset_name=asset.name,
                    notes=f"Removed {asset.quantity} units of {asset.name}"
                )
                db.session.add(cash_flow)
                db.session.delete(asset)
                db.session.commit()

                return jsonify({"message": "Asset deleted successfully"}), 200

            except exc.SQLAlchemyError as e:
                db.session.rollback()
                return jsonify({"message": f"Database error: {str(e)}"}), 500

    @app.route('/api/history/update', methods=['POST'])
    @limiter.limit("100 per hour")
    @token_required
    def update_history(current_user):
        """
        Record today's total portfolio value for the user.
        Accepts total_value from frontend (calculated with live prices).
        If not provided, falls back to cost_basis calculation.
        Weekend requests are mapped to Friday's date.
        """
        try:
            # Get current UTC time and map weekends to Friday
            now_utc = datetime.now(timezone.utc)
            today_date = get_last_weekday_date(now_utc.date())
            # Create UTC datetime for the date (use current time, not midnight)
            today_datetime = now_utc.replace(hour=0, minute=0, second=0, microsecond=0) if today_date == now_utc.date() else datetime.combine(today_date, datetime.min.time(), tzinfo=timezone.utc)
            data = request.get_json() or {}
            
            # Use provided total_value from frontend (calculated with live prices)
            # If not provided, fall back to live price calculation
            if 'total_value' in data:
                total_value = float(data['total_value'])
            else:
                # Fallback: calculate using live prices
                total_value = calculate_user_portfolio_value(current_user.id)

            # Check if today's history exists (query by date range for the UTC day)
            start_of_day = datetime.combine(today_date, datetime.min.time(), tzinfo=timezone.utc)
            end_of_day = datetime.combine(today_date, datetime.max.time(), tzinfo=timezone.utc)
            history = PortfolioHistory.query.filter(
                PortfolioHistory.user_id == current_user.id,
                PortfolioHistory.date >= start_of_day,
                PortfolioHistory.date <= end_of_day
            ).first()

            if history:
                history.total_value = total_value  # update entry
                history.date = now_utc  # update timestamp to current UTC time
            else:
                history = PortfolioHistory(
                    user_id=current_user.id,
                    date=now_utc,  # Store full UTC datetime
                    total_value=total_value
                )
                db.session.add(history)

            db.session.commit()

            return jsonify({
                "message": "History updated",
                "date": now_utc.isoformat(),
                "total_value": total_value
            }), 200

        except ValueError:
            return jsonify({"message": "total_value must be a number"}), 400
        except Exception as e:
            db.session.rollback()
            return jsonify({"message": f"Error updating history: {str(e)}"}), 500



    @app.route('/api/history', methods=['GET'])
    @limiter.limit("100 per hour")
    @token_required
    def get_history(current_user):
        """
        Return 30 days of portfolio history with on-demand generation.
        Uses cached snapshots when available, calculates missing dates automatically.
        Handles weekends/holidays gracefully. Works for stocks, ETF, and crypto.
        """
        try:
            # Get query parameter for custom days (default 30)
            days = request.args.get('days', 30, type=int)
            
            # Limit to reasonable range
            if days < 1:
                days = 30
            elif days > 365:
                days = 365
            
            # Generate chart data on-demand
            chart_data = generate_portfolio_chart_data(current_user.id, days=days)
            
            return jsonify(chart_data), 200

        except Exception as e:
            logger.error(f"Error fetching history: {str(e)}")
            return jsonify({"message": f"Error fetching history: {str(e)}"}), 500

    # -------------------------------------------------------------------------
    # CACHED PRICES (Redis - single call for all prices)
    # -------------------------------------------------------------------------

    @app.route('/api/prices/cached', methods=['GET'])
    @limiter.limit("200 per hour")
    @token_required
    def get_cached_prices(current_user):
        """
        Return ALL cached prices from Redis in one call.
        Frontend calls this once on login instead of individual API calls.
        """
        try:
            # Get all the user's asset symbols
            assets = Asset.query.filter_by(user_id=current_user.id).all()
            if not assets:
                return jsonify({"prices": {}, "source": "cache", "last_refresh": None}), 200

            # Build list of Redis keys to fetch
            symbols = []
            for asset in assets:
                symbol = asset.name.strip().upper()
                asset_type = (asset.asset_type or 'stock').lower()
                if asset_type in ('stock', 'etf'):
                    symbols.append(f"stock:{symbol}")
                elif asset_type == 'crypto':
                    symbols.append(f"crypto:{symbol}")

            # Batch get from Redis
            cached = redis_cache.get_all_prices(symbols)

            # Map back to plain symbol names for frontend
            prices = {}
            for key, price in cached.items():
                # key is like "stock:AAPL" or "crypto:BTC" — extract the symbol
                symbol = key.split(":", 1)[1] if ":" in key else key
                prices[symbol] = price

            last_refresh = redis_cache.get_last_refresh_time()
            last_refresh_iso = last_refresh.isoformat() if last_refresh else None

            return jsonify({
                "prices": prices,
                "source": "cache",
                "last_refresh": last_refresh_iso
            }), 200

        except Exception as e:
            logger.warning(f"Failed to get cached prices: {e}")
            return jsonify({"prices": {}, "source": "cache", "last_refresh": None}), 200

    # -------------------------------------------------------------------------
    # PRICE ROUTES (Proxy to Finnhub - keeps API key server-side)
    # -------------------------------------------------------------------------

    @app.route('/api/prices/quote/<symbol>', methods=['GET'])
    @limiter.limit("60 per minute")  # Allow frequent price checks
    @token_required
    def get_quote(current_user, symbol):
        """
        Get live price quote for a symbol
        Proxies request to Finnhub API - keeps API key secure on server
        """
        try:
            if not symbol:
                return jsonify({"message": "Symbol is required"}), 400
            
            symbol = symbol.strip().upper()
            
            is_valid, error = check_finnhub_key()
            if not is_valid:
                error["price"] = None
                return jsonify(error), 200
            
            price = fetch_live_price(symbol)
            
            return jsonify({
                "symbol": symbol,
                "price": price,
                "source": "finnhub"
            }), 200
            
        except Exception as e:
            return jsonify({"message": f"Error fetching quote: {str(e)}"}), 500
    
    @app.route('/api/prices/batch', methods=['POST'])
    @limiter.limit("30 per minute")  # Batch requests are heavier
    @token_required
    def get_batch_quotes(current_user):
        """
        Get live prices for multiple symbols at once
        Request body: {"symbols": ["AAPL", "GOOGL", "MSFT"]}
        """
        try:
            data = request.get_json()
            symbols = data.get('symbols', [])
            
            if not symbols or not isinstance(symbols, list):
                return jsonify({"message": "symbols array is required"}), 400
            
            if len(symbols) > 20:
                return jsonify({"message": "Maximum 20 symbols per request"}), 400
            
            is_valid, error = check_finnhub_key()
            if not is_valid:
                error["prices"] = {}
                return jsonify(error), 200
            
            prices = {}
            
            # Use ThreadPoolExecutor to fetch prices in parallel (max 5 workers)
            with ThreadPoolExecutor(max_workers=5) as executor:
                # Submit all price fetch tasks
                future_to_symbol = {
                    executor.submit(fetch_live_price, symbol.strip().upper()): symbol.strip().upper()
                    for symbol in symbols
                }
                
                # Collect results as they complete
                for future in as_completed(future_to_symbol):
                    symbol = future_to_symbol[future]
                    try:
                        price = future.result()
                        if price is not None:
                            prices[symbol] = price
                    except Exception as e:
                        logger.error(f"Error fetching price for {symbol}: {str(e)}")
            
            return jsonify({
                "prices": prices,
                "source": "finnhub"
            }), 200
            
        except Exception as e:
            return jsonify({"message": f"Error fetching batch quotes: {str(e)}"}), 500
    
    @app.route('/api/prices/search', methods=['GET'])
    @limiter.limit("30 per minute")
    @token_required
    def search_symbols(current_user):
        """
        Search for stock symbols
        Query param: ?q=apple
        """
        try:
            query = request.args.get('q', '').strip()
            
            if not query or len(query) < 2:
                return jsonify({"results": []}), 200
            
            is_valid, error = check_finnhub_key()
            if not is_valid:
                error["results"] = []
                return jsonify(error), 200
            
            url = f"https://finnhub.io/api/v1/search?q={query}&token={FINNHUB_KEY}"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            if not data or 'result' not in data:
                return jsonify({"results": []}), 200
            
            # Return up to 10 results
            results = []
            for item in data['result'][:10]:
                results.append({
                    "symbol": item.get('symbol'),
                    "description": item.get('description'),
                    "displaySymbol": item.get('displaySymbol', item.get('symbol')),
                    "type": "stock"
                })
            
            return jsonify({"results": results}), 200
            
        except requests.exceptions.Timeout:
            return jsonify({"message": "Search timed out", "results": []}), 200
        except Exception as e:
            return jsonify({"message": f"Error searching symbols: {str(e)}"}), 500

    # -------------------------------------------------------------------------
    # CRYPTO ROUTES (Using CoinGecko - free, no API key needed)
    # -------------------------------------------------------------------------
    
    @app.route('/api/crypto/quote/<symbol>', methods=['GET'])
    @limiter.limit("60 per minute")
    @token_required
    def get_crypto_quote(current_user, symbol):
        """
        Get live crypto price quote
        Uses CoinGecko API (free, no key required)
        """
        try:
            if not symbol:
                return jsonify({"message": "Symbol is required"}), 400
            
            symbol = symbol.strip().upper()
            price = fetch_crypto_price(symbol)
            
            return jsonify({
                "symbol": symbol,
                "price": price,
                "source": "coingecko"
            }), 200
            
        except Exception as e:
            return jsonify({"message": f"Error fetching crypto quote: {str(e)}"}), 500
    
    @app.route('/api/crypto/search', methods=['GET'])
    @limiter.limit("30 per minute")
    @token_required
    def search_crypto_symbols(current_user):
        """
        Search for cryptocurrencies
        Query param: ?q=bitcoin
        """
        try:
            query = request.args.get('q', '').strip()
            
            if not query or len(query) < 2:
                return jsonify({"results": []}), 200
            
            results = search_crypto(query)
            return jsonify({"results": results}), 200
            
        except Exception as e:
            return jsonify({"message": f"Error searching crypto: {str(e)}"}), 500

    # -------------------------------------------------------------------------
    # PORTFOLIO INSIGHTS (Backend-heavy allocation calculations)
    # -------------------------------------------------------------------------
    
    @app.route('/api/portfolio/insights', methods=['POST'])
    @limiter.limit("60 per minute")
    @token_required
    def get_portfolio_insights(current_user):
        """
        Calculate detailed portfolio allocation and insights
        Accepts live prices from frontend and returns allocation breakdown
        
        Request body: {
            "prices": {"AAPL": 150.25, "BTC": 42000, ...}
        }
        
        Response: {
            "total_value": 10000,
            "total_invested": 8000,
            "total_gain_loss": 2000,
            "total_gain_loss_pct": 25.0,
            "by_asset": [
                {"name": "AAPL", "type": "Stock", "value": 3000, "percentage": 30, ...},
                ...
            ],
            "by_type": [
                {"type": "Stock", "value": 5000, "percentage": 50},
                ...
            ]
        }
        """
        try:
            data = request.get_json() or {}
            live_prices = data.get('prices', {})
            
            # Get all user assets
            assets = Asset.query.filter_by(user_id=current_user.id).all()
            
            if not assets:
                return jsonify({
                    "total_value": 0,
                    "total_invested": 0,
                    "total_gain_loss": 0,
                    "total_gain_loss_pct": 0,
                    "by_asset": [],
                    "by_type": []
                }), 200
            
            # Calculate per-asset values
            asset_breakdown = []
            type_totals = {}
            total_value = 0
            total_invested = 0
            
            for asset in assets:
                quantity = float(asset.quantity)
                cost_basis = float(asset.cost_basis)
                avg_price = cost_basis / quantity if quantity > 0 else 0
                
                # Get current price (from live prices or fallback to avg price)
                symbol = asset.name.strip().upper()
                current_price = live_prices.get(symbol, avg_price)
                current_value = current_price * quantity
                
                gain_loss = current_value - cost_basis
                gain_loss_pct = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0
                
                asset_data = {
                    "id": asset.id,
                    "name": asset.name,
                    "type": asset.asset_type,
                    "quantity": quantity,
                    "cost_basis": cost_basis,
                    "avg_price": round(avg_price, 2),
                    "current_price": round(current_price, 2),
                    "current_value": round(current_value, 2),
                    "value": round(current_value, 2),  # Alias for chart compatibility
                    "gain_loss": round(gain_loss, 2),
                    "gain_loss_pct": round(gain_loss_pct, 2),
                    "percentage": 0  # Will calculate after total
                }
                asset_breakdown.append(asset_data)
                
                total_value += current_value
                total_invested += cost_basis
                
                # Aggregate by type
                asset_type = asset.asset_type or 'Other'
                if asset_type not in type_totals:
                    type_totals[asset_type] = {"value": 0, "invested": 0}
                type_totals[asset_type]["value"] += current_value
                type_totals[asset_type]["invested"] += cost_basis
            
            # Calculate percentages with higher precision for small holdings
            for asset_data in asset_breakdown:
                if total_value > 0:
                    pct = (asset_data["current_value"] / total_value) * 100
                    # Use more decimal places for very small percentages
                    if pct < 0.1:
                        asset_data["percentage"] = round(pct, 4)  # e.g., 0.0052%
                    elif pct < 1:
                        asset_data["percentage"] = round(pct, 2)  # e.g., 0.52%
                    else:
                        asset_data["percentage"] = round(pct, 1)  # e.g., 5.2%
            
            # Sort by percentage (highest first)
            asset_breakdown.sort(key=lambda x: x["percentage"], reverse=True)
            
            # Build type breakdown
            type_breakdown = []
            for asset_type, totals in type_totals.items():
                pct = (totals["value"] / total_value * 100) if total_value > 0 else 0
                # Use more decimal places for very small percentages
                if pct < 0.1:
                    rounded_pct = round(pct, 4)
                elif pct < 1:
                    rounded_pct = round(pct, 2)
                else:
                    rounded_pct = round(pct, 1)
                type_breakdown.append({
                    "type": asset_type,
                    "value": round(totals["value"], 2),
                    "invested": round(totals["invested"], 2),
                    "percentage": rounded_pct
                })
            
            type_breakdown.sort(key=lambda x: x["percentage"], reverse=True)
            
            total_gain_loss = total_value - total_invested
            total_gain_loss_pct = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0
            
            return jsonify({
                "total_value": round(total_value, 2),
                "total_invested": round(total_invested, 2),
                "total_gain_loss": round(total_gain_loss, 2),
                "total_gain_loss_pct": round(total_gain_loss_pct, 2),
                "by_asset": asset_breakdown,
                "by_type": type_breakdown
            }), 200
            
        except Exception as e:
            return jsonify({"message": f"Error calculating insights: {str(e)}"}), 500

    # -------------------------------------------------------------------------
    # BENCHMARK COMPARISON (S&P 500)
    # -------------------------------------------------------------------------
    
    @app.route('/api/benchmark/comparison', methods=['GET'])
    @limiter.limit("30 per minute")
    @token_required
    def get_benchmark_comparison(current_user):
        """
        Get portfolio vs S&P 500 performance comparison.
        Uses Time-Weighted Return (TWR) for portfolio to exclude cash flow impacts.
        """
        try:
            # Get user's portfolio history
            history = PortfolioHistory.query.filter_by(
                user_id=current_user.id
            ).order_by(PortfolioHistory.date.asc()).all()

            if not history or len(history) < 2:
                return jsonify({
                    "message": "Need at least 2 days of portfolio history for comparison",
                    "data": []
                }), 200

            # Get date range
            start_date = history[0].date.date() if hasattr(history[0].date, 'date') else history[0].date
            end_date = history[-1].date.date() if hasattr(history[-1].date, 'date') else history[-1].date
            start_value = float(history[0].total_value)

            if start_value <= 0:
                return jsonify({
                    "message": "Invalid starting portfolio value",
                    "data": []
                }), 200

            # Fetch S&P 500 (SPY) historical data from Yahoo Finance
            spy_data = {}
            try:
                start_timestamp = int(datetime.combine(start_date, datetime.min.time()).timestamp())
                end_timestamp = int(datetime.combine(end_date, datetime.max.time()).timestamp()) + 86400

                yahoo_url = f"https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1={start_timestamp}&period2={end_timestamp}&interval=1d"

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }

                response = requests.get(yahoo_url, headers=headers, timeout=10)
                response.raise_for_status()

                data = response.json()

                if data and 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                    result = data['chart']['result'][0]
                    timestamps = result.get('timestamp', [])
                    closes = result.get('indicators', {}).get('quote', [{}])[0].get('close', [])

                    for i, ts in enumerate(timestamps):
                        if i < len(closes) and closes[i] is not None:
                            date_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime('%Y-%m-%d')
                            spy_data[date_str] = closes[i]

                    logger.info(f"Fetched {len(spy_data)} days of SPY data from Yahoo Finance")

            except Exception as e:
                logger.warning(f"Failed to fetch SPY data from Yahoo Finance: {str(e)}")

            # Get S&P 500 starting value
            spy_start_value = None
            for h in history:
                h_date = h.date.date() if hasattr(h.date, 'date') else h.date
                date_str = h_date.strftime('%Y-%m-%d')
                if date_str in spy_data:
                    spy_start_value = spy_data[date_str]
                    break

            # Build value dict and forward-fill for all dates in range
            value_dict = {}
            for h in history:
                h_date = h.date.date() if hasattr(h.date, 'date') else h.date
                value_dict[h_date] = float(h.total_value)

            # Get cash flows for TWR calculation
            start_datetime = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
            end_datetime = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)

            flows = CashFlow.query.filter(
                CashFlow.user_id == current_user.id,
                CashFlow.date >= start_datetime,
                CashFlow.date <= end_datetime
            ).order_by(CashFlow.date.asc()).all()

            flow_dict = {}
            for flow in flows:
                d = flow.date.date()
                flow_dict[d] = flow_dict.get(d, 0.0) + float(flow.amount)

            # Iterate all dates, forward-fill values, compute cumulative TWR
            all_dates = []
            d = start_date
            while d <= end_date:
                all_dates.append(d)
                d += timedelta(days=1)

            filled_values = {}
            last_val = 0
            for d in all_dates:
                if d in value_dict:
                    last_val = value_dict[d]
                filled_values[d] = last_val

            # Compute cumulative TWR
            cumulative_twr = 0.0  # starts at 0% return
            prev_value = filled_values[all_dates[0]]
            twr_by_date = {all_dates[0]: 0.0}

            for i in range(1, len(all_dates)):
                d = all_dates[i]
                today_value = filled_values[d]
                today_flow = flow_dict.get(d, 0.0)

                if prev_value > 0:
                    daily_return = (today_value - today_flow) / prev_value - 1.0
                    daily_return = max(-0.99, min(daily_return, 10.0))
                else:
                    daily_return = 0.0

                cumulative_twr = (1 + cumulative_twr) * (1 + daily_return) - 1
                twr_by_date[d] = cumulative_twr
                prev_value = today_value

            # Build comparison data
            comparison_data = []
            for d in all_dates:
                date_str = d.strftime('%Y-%m-%d')
                portfolio_pct = twr_by_date.get(d, 0.0) * 100

                spy_pct = None
                if spy_start_value and date_str in spy_data:
                    spy_value = spy_data[date_str]
                    spy_pct = ((spy_value - spy_start_value) / spy_start_value) * 100

                comparison_data.append({
                    "date": date_str,
                    "portfolio": round(portfolio_pct, 2),
                    "sp500": round(spy_pct, 2) if spy_pct is not None else None,
                    "portfolioValue": round(filled_values[d], 2)
                })

            # Forward-fill missing S&P data
            last_spy = None
            for item in comparison_data:
                if item["sp500"] is not None:
                    last_spy = item["sp500"]
                elif last_spy is not None:
                    item["sp500"] = last_spy

            return jsonify({
                "data": comparison_data,
                "start_date": datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc).isoformat(),
                "end_date": datetime.combine(end_date, datetime.min.time(), tzinfo=timezone.utc).isoformat(),
                "portfolio_start": start_value,
                "has_sp500_data": len(spy_data) > 0
            }), 200

        except Exception as e:
            return jsonify({"message": f"Error fetching comparison: {str(e)}"}), 500

    # -------------------------------------------------------------------------
    # MONTE CARLO RISK SIMULATION
    # -------------------------------------------------------------------------

    def _fetch_yahoo_history(symbol, asset_type, days=365):
        """Fetch historical daily closes from Yahoo Finance for a single ticker."""
        try:
            # Map crypto symbols to Yahoo Finance format
            if asset_type.lower() == 'crypto':
                yahoo_symbol = f"{symbol}-USD"
            else:
                yahoo_symbol = symbol

            end_ts = int(datetime.now(timezone.utc).timestamp())
            start_ts = end_ts - (days * 86400)

            url = (
                f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}"
                f"?period1={start_ts}&period2={end_ts}&interval=1d"
            )
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            resp = requests.get(url, headers=headers, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            result = data.get('chart', {}).get('result', [])
            if not result:
                return None

            closes = result[0].get('indicators', {}).get('quote', [{}])[0].get('close', [])
            # Filter out None values
            prices = [c for c in closes if c is not None]
            return prices if len(prices) >= 20 else None
        except Exception as e:
            logger.warning(f"Failed to fetch Yahoo history for {symbol}: {e}")
            return None

    @app.route('/api/portfolio/monte-carlo', methods=['POST'])
    @limiter.limit("10 per minute")
    @token_required
    def run_monte_carlo(current_user):
        """
        Run Monte Carlo simulation on the user's portfolio.

        Request body: {
            "prices": {"AAPL": 150.25, "BTC": 42000, ...},
            "timeframe_days": 90
        }
        """
        try:
            data = request.get_json() or {}
            live_prices = data.get('prices', {})
            timeframe_days = data.get('timeframe_days', 90)

            # Validate timeframe
            if timeframe_days not in (30, 90, 252):
                timeframe_days = 90

            # Get user assets
            assets = Asset.query.filter_by(user_id=current_user.id).all()

            if not assets:
                return jsonify({"message": "No assets in portfolio"}), 200

            # Build portfolio: symbol -> (weight based on current value, asset_type)
            asset_info = []
            total_value = 0

            for asset in assets:
                symbol = asset.name.strip().upper()
                quantity = float(asset.quantity)
                cost_basis = float(asset.cost_basis)
                avg_price = cost_basis / quantity if quantity > 0 else 0
                current_price = live_prices.get(symbol, avg_price)
                value = current_price * quantity
                total_value += value
                asset_info.append({
                    'symbol': symbol,
                    'asset_type': asset.asset_type or 'Stock',
                    'value': value,
                })

            if total_value <= 0:
                return jsonify({"message": "Portfolio value is zero"}), 200

            # Calculate weights
            for a in asset_info:
                a['weight'] = a['value'] / total_value

            # Fetch historical prices in parallel
            historical = {}
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_map = {
                    executor.submit(
                        _fetch_yahoo_history,
                        a['symbol'],
                        a['asset_type'],
                        400  # ~1.1 years to ensure enough trading days
                    ): a['symbol']
                    for a in asset_info
                }
                for future in as_completed(future_map):
                    sym = future_map[future]
                    try:
                        result = future.result()
                        if result is not None:
                            historical[sym] = result
                    except Exception as e:
                        logger.warning(f"History fetch failed for {sym}: {e}")

            # Filter to assets that have historical data
            included = [a for a in asset_info if a['symbol'] in historical]
            excluded = [a['symbol'] for a in asset_info if a['symbol'] not in historical]

            if not included:
                return jsonify({
                    "message": "Could not fetch historical data for any assets",
                    "assets_excluded": excluded,
                }), 200

            # Recalculate weights for included assets only
            included_value = sum(a['value'] for a in included)
            weights = np.array([a['value'] / included_value for a in included])

            # Build daily log-returns matrix
            # Trim all to the same length (shortest series)
            min_len = min(len(historical[a['symbol']]) for a in included)
            price_matrix = np.column_stack([
                np.array(historical[a['symbol']][-min_len:]) for a in included
            ])

            # Daily log returns
            log_returns = np.diff(np.log(price_matrix), axis=0)

            # Mean daily returns and covariance
            mean_returns = np.mean(log_returns, axis=0)
            cov_matrix = np.cov(log_returns, rowvar=False)

            # Ensure covariance matrix is 2D (single asset case)
            if cov_matrix.ndim == 0:
                cov_matrix = np.array([[float(cov_matrix)]])
            elif cov_matrix.ndim == 1:
                cov_matrix = cov_matrix.reshape(1, 1)

            # Cholesky decomposition for correlated random walks
            try:
                L = np.linalg.cholesky(cov_matrix)
            except np.linalg.LinAlgError:
                # Regularize if not positive-definite
                L = np.linalg.cholesky(
                    cov_matrix + np.eye(len(cov_matrix)) * 1e-8
                )

            # Run simulation
            num_sims = 10000
            num_days = timeframe_days
            num_assets = len(included)

            portfolio_values = np.zeros((num_sims, num_days + 1))
            portfolio_values[:, 0] = total_value

            # Ito correction: subtract 0.5*variance per asset to remove
            # upward bias from exp() (Jensen's inequality)
            drift = mean_returns - 0.5 * np.diag(cov_matrix)

            for t in range(1, num_days + 1):
                Z = np.random.standard_normal((num_sims, num_assets))
                correlated = Z @ L.T
                daily_return = np.exp(
                    np.sum(weights * (drift + correlated), axis=1)
                )
                portfolio_values[:, t] = portfolio_values[:, t - 1] * daily_return

            # Extract percentile paths
            p5 = np.percentile(portfolio_values, 5, axis=0)
            p25 = np.percentile(portfolio_values, 25, axis=0)
            p50 = np.percentile(portfolio_values, 50, axis=0)
            p75 = np.percentile(portfolio_values, 75, axis=0)
            p95 = np.percentile(portfolio_values, 95, axis=0)

            # Final day statistics
            final = portfolio_values[:, -1]
            var_95 = total_value - float(np.percentile(final, 5))
            expected_value = float(np.mean(final))
            expected_return_pct = ((expected_value - total_value) / total_value) * 100

            return jsonify({
                "paths": {
                    "p5": [round(v, 2) for v in p5.tolist()],
                    "p25": [round(v, 2) for v in p25.tolist()],
                    "p50": [round(v, 2) for v in p50.tolist()],
                    "p75": [round(v, 2) for v in p75.tolist()],
                    "p95": [round(v, 2) for v in p95.tolist()],
                },
                "stats": {
                    "current_value": round(total_value, 2),
                    "expected_value": round(expected_value, 2),
                    "expected_return_pct": round(expected_return_pct, 2),
                    "var_95": round(var_95, 2),
                    "var_95_pct": round((var_95 / total_value) * 100, 2),
                    "median_final": round(float(p50[-1]), 2),
                    "best_case": round(float(np.percentile(final, 95)), 2),
                    "worst_case": round(float(np.percentile(final, 5)), 2),
                },
                "timeframe_days": num_days,
                "num_simulations": num_sims,
                "assets_included": [a['symbol'] for a in included],
                "assets_excluded": excluded,
            }), 200

        except Exception as e:
            logger.error(f"Monte Carlo simulation error: {e}")
            return jsonify({"message": f"Simulation error: {str(e)}"}), 500

    # -------------------------------------------------------------------------
    # PORTFOLIO DIVERSIFICATION SCORE
    # -------------------------------------------------------------------------

    @app.route('/api/portfolio/diversification', methods=['POST'])
    @limiter.limit("30 per minute")
    @token_required
    def get_diversification_score(current_user):
        """
        Calculate portfolio diversification score (0-100) based on:
        - HHI (Herfindahl-Hirschman Index) for concentration
        - Sector distribution across holdings
        - Asset class spread (stocks vs crypto vs ETFs)

        Request body: { "prices": {"AAPL": 150.25, "BTC": 42000, ...} }
        """
        try:
            data = request.get_json() or {}
            live_prices = data.get('prices', {})

            assets = Asset.query.filter_by(user_id=current_user.id).all()

            if not assets:
                return jsonify({
                    "score": 0,
                    "hhi": 0,
                    "sector_count": 0,
                    "asset_class_count": 0,
                    "sectors": {},
                    "asset_classes": {},
                    "holdings_count": 0,
                    "message": "No assets in portfolio"
                }), 200

            # --- Step 1: Calculate portfolio weights ---
            holdings = []
            total_value = 0

            for asset in assets:
                quantity = float(asset.quantity)
                cost_basis = float(asset.cost_basis)
                avg_price = cost_basis / quantity if quantity > 0 else 0
                symbol = asset.name.strip().upper()
                current_price = live_prices.get(symbol, avg_price)
                current_value = current_price * quantity

                holdings.append({
                    "symbol": symbol,
                    "type": (asset.asset_type or 'Stock').strip(),
                    "value": current_value,
                })
                total_value += current_value

            if total_value <= 0:
                return jsonify({"score": 0, "message": "Portfolio value is zero"}), 200

            # Calculate weights (fraction of total portfolio)
            for h in holdings:
                h["weight"] = h["value"] / total_value

            # --- Step 2: HHI (Herfindahl-Hirschman Index) ---
            # Sum of squared weights. Range: 1/n (perfect) to 1.0 (single asset)
            hhi = sum(h["weight"] ** 2 for h in holdings)

            # --- Step 3: Sector distribution ---
            # Fetch sector data for stocks/ETFs only
            stock_symbols = [h["symbol"] for h in holdings if h["type"].lower() in ('stock', 'etf')]
            sector_data = fetch_sectors_batch(stock_symbols) if stock_symbols else {}

            sector_weights = {}
            for h in holdings:
                if h["type"].lower() == 'crypto':
                    sector = 'Cryptocurrency'
                elif h["symbol"] in sector_data:
                    sector = sector_data[h["symbol"]].get("sector", "Unknown")
                else:
                    sector = "Unknown"

                h["sector"] = sector
                sector_weights[sector] = sector_weights.get(sector, 0) + h["weight"]

            sector_count = len([s for s, w in sector_weights.items() if w > 0.01])

            # --- Step 4: Asset class spread ---
            class_weights = {}
            for h in holdings:
                asset_class = h["type"]
                class_weights[asset_class] = class_weights.get(asset_class, 0) + h["weight"]

            asset_class_count = len(class_weights)

            # --- Step 5: Combine into 0-100 score ---
            n = len(holdings)

            # HHI score (40% weight): compare actual HHI to perfect diversification (1/n)
            perfect_hhi = 1.0 / n if n > 0 else 1.0
            # Normalize: 0 = single asset, 100 = perfectly equal weights
            if n <= 1:
                hhi_score = 0
            else:
                # (1 - HHI) / (1 - 1/n) gives 0 to 1 range
                hhi_score = max(0, min(100, ((1 - hhi) / (1 - perfect_hhi)) * 100))

            # Sector score (35% weight): more sectors = better, max benefit at 6+
            max_sectors = 6
            sector_score = min(100, (sector_count / max_sectors) * 100)

            # Asset class score (25% weight): having multiple asset classes
            max_classes = 3  # Stock, Crypto, ETF
            class_score = min(100, (asset_class_count / max_classes) * 100)

            # Weighted final score
            final_score = round(
                hhi_score * 0.40 +
                sector_score * 0.35 +
                class_score * 0.25,
                1
            )

            # Round sector weights for display
            sector_display = {k: round(v * 100, 1) for k, v in sector_weights.items()}
            class_display = {k: round(v * 100, 1) for k, v in class_weights.items()}

            # --- Step 6: Generate recommendations ---
            recommendations = generate_recommendations(
                holdings, sector_weights, class_weights, final_score
            )

            return jsonify({
                "score": final_score,
                "hhi": round(hhi, 4),
                "hhi_score": round(hhi_score, 1),
                "sector_score": round(sector_score, 1),
                "class_score": round(class_score, 1),
                "sector_count": sector_count,
                "sectors": sector_display,
                "asset_class_count": asset_class_count,
                "asset_classes": class_display,
                "holdings_count": n,
                "recommendations": recommendations,
            }), 200

        except Exception as e:
            logger.error(f"Diversification score error: {e}")
            return jsonify({"message": f"Error calculating diversification: {str(e)}"}), 500

    # -------------------------------------------------------------------------
    # ERROR HANDLERS
    # -------------------------------------------------------------------------
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"message": "Resource not found"}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"message": "Internal server error"}), 500
    
    return app

# Run the app (for development)
if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)