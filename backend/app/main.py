from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.auth import generate_token, token_required
from app.models import db, User, Asset, PortfolioHistory
from app.config import Config
from sqlalchemy import exc
from datetime import date, datetime
from apscheduler.schedulers.background import BackgroundScheduler
from app.scheduler import record_daily_snapshot, fetch_live_price, fetch_crypto_price, search_crypto, FINNHUB_KEY
import requests, jwt
import os
import logging

# Set up logger for this module
logger = logging.getLogger(__name__)


def create_app(config_class=Config):
    """
    Application factory pattern
    Creates and configures the Flask app
    """
    app = Flask(__name__)
    app.config.from_object(config_class)
    #app.config.from_object(config_class)
    
    # Enable CORS for frontend to communicate with backend
    # In production, replace "*" with your frontend domain
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Initialize rate limiter to prevent spam and API abuse
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["30 per day", "10 per hour"],
        storage_uri="memory://"
    )
    
    # Initialize database
    db.init_app(app)
    
    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        print(" Database tables created successfully!")
        
        # Configure logging for scheduler
        logging.basicConfig(level=logging.INFO)
        
        # Initialize and start the APScheduler for daily snapshots
        scheduler = BackgroundScheduler()
        
        # PRODUCTION: Schedule the daily snapshot job to run at 2 AM daily
        scheduler.add_job(
            func=record_daily_snapshot,
            trigger="cron",
            hour=2,
            minute=0,
            id='daily_portfolio_snapshot',
            name='Record daily portfolio snapshots for all users',
            replace_existing=True,
            max_instances=1
        )
        
        # TEST/DEVELOPMENT: Uncomment below to test - runs every 1 minute
        # scheduler.add_job(
        #     func=record_daily_snapshot,
        #     trigger="interval",
        #     minutes=1,
        #     id='test_portfolio_snapshot',
        #     name='TEST: Record portfolio snapshots every minute',
        #     replace_existing=True,
        #     max_instances=1
        # )
        
        # Start the scheduler
        if not scheduler.running:
            scheduler.start()
            print("APScheduler initialized - Daily snapshots enabled!")
    
    # -------------------------------------------------------------------------
    # HEALTH CHECK ROUTE
    # -------------------------------------------------------------------------
    @app.route('/api/status', methods=['GET'])
    def get_status():
        """Check if API is running"""
        return jsonify({
            "status": "online",
            "message": "StockPulse API is running",
            "version": "1.0.0"
        }), 200
    
    # -------------------------------------------------------------------------
    # AUTHENTICATION ROUTES
    # -------------------------------------------------------------------------
    
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
        """
        try:
            today = date.today()
            data = request.get_json() or {}
            
            # Use provided total_value from frontend (calculated with live prices)
            # If not provided, fall back to cost_basis calculation
            if 'total_value' in data:
                total_value = float(data['total_value'])
            else:
                # Fallback: calculate from cost_basis (for backwards compatibility)
                total_value = compute_user_total_value(current_user.id)

            # Check if today's history exists
            history = PortfolioHistory.query.filter_by(
                user_id=current_user.id,
                date=today
            ).first()

            if history:
                history.total_value = total_value  # update entry
            else:
                history = PortfolioHistory(
                    user_id=current_user.id,
                    date=today,
                    total_value=total_value
                )
                db.session.add(history)

            db.session.commit()

            return jsonify({
                "message": "History updated",
                "date": today.isoformat(),
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
        """Return the user's portfolio history sorted by date."""
        try:
            history = PortfolioHistory.query.filter_by(
                user_id=current_user.id
            ).order_by(PortfolioHistory.date.asc()).all()

            return jsonify([h.to_dict() for h in history]), 200

        except Exception as e:
            return jsonify({"message": f"Error fetching history: {str(e)}"}), 500

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
            
            if not FINNHUB_KEY or FINNHUB_KEY == "YOUR_FINNHUB_API_KEY":
                return jsonify({
                    "message": "Finnhub API key not configured on server",
                    "price": None
                }), 200
            
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
            
            if not FINNHUB_KEY or FINNHUB_KEY == "YOUR_FINNHUB_API_KEY":
                return jsonify({
                    "message": "Finnhub API key not configured on server",
                    "prices": {}
                }), 200
            
            prices = {}
            for symbol in symbols:
                symbol = symbol.strip().upper()
                price = fetch_live_price(symbol)
                if price is not None:
                    prices[symbol] = price
            
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
            
            if not FINNHUB_KEY or FINNHUB_KEY == "YOUR_FINNHUB_API_KEY":
                return jsonify({
                    "message": "Finnhub API key not configured on server",
                    "results": []
                }), 200
            
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
        Get portfolio vs S&P 500 performance comparison
        Returns normalized percentage change from the earliest portfolio date
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
            
            # Get date range from portfolio history
            start_date = history[0].date
            end_date = history[-1].date
            start_value = float(history[0].total_value)
            
            if start_value <= 0:
                return jsonify({
                    "message": "Invalid starting portfolio value",
                    "data": []
                }), 200
            
            # Fetch S&P 500 (SPY) historical data from Yahoo Finance (free, no API key needed)
            spy_data = {}
            try:
                # Yahoo Finance API for historical data
                # period1 and period2 are Unix timestamps
                start_timestamp = int(datetime.combine(start_date, datetime.min.time()).timestamp())
                end_timestamp = int(datetime.combine(end_date, datetime.max.time()).timestamp()) + 86400  # Add 1 day buffer
                
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
                            date_str = datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
                            spy_data[date_str] = closes[i]
                    
                    logger.info(f"Fetched {len(spy_data)} days of SPY data from Yahoo Finance")
                            
            except Exception as e:
                logger.warning(f"Failed to fetch SPY data from Yahoo Finance: {str(e)}")
            
            # Get S&P 500 starting value (first available date)
            spy_start_value = None
            for h in history:
                date_str = h.date.strftime('%Y-%m-%d')
                if date_str in spy_data:
                    spy_start_value = spy_data[date_str]
                    break
            
            # Build comparison data - normalize both to percentage change
            comparison_data = []
            for h in history:
                date_str = h.date.strftime('%Y-%m-%d')
                portfolio_value = float(h.total_value)
                
                # Calculate portfolio percentage change from start
                portfolio_pct = ((portfolio_value - start_value) / start_value) * 100
                
                # Calculate S&P 500 percentage change from start
                spy_pct = None
                if spy_start_value and date_str in spy_data:
                    spy_value = spy_data[date_str]
                    spy_pct = ((spy_value - spy_start_value) / spy_start_value) * 100
                
                comparison_data.append({
                    "date": date_str,
                    "portfolio": round(portfolio_pct, 2),
                    "sp500": round(spy_pct, 2) if spy_pct is not None else None,
                    "portfolioValue": round(portfolio_value, 2)
                })
            
            # Fill in missing S&P data with last known value
            last_spy = None
            for item in comparison_data:
                if item["sp500"] is not None:
                    last_spy = item["sp500"]
                elif last_spy is not None:
                    item["sp500"] = last_spy
            
            return jsonify({
                "data": comparison_data,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "portfolio_start": start_value,
                "has_sp500_data": len(spy_data) > 0
            }), 200
            
        except Exception as e:
            return jsonify({"message": f"Error fetching comparison: {str(e)}"}), 500

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

def compute_user_total_value(user_id):
    """Calculates the user's current total portfolio value."""
    assets = Asset.query.filter_by(user_id=user_id).all()
    if not assets:
        return 0.0

    total = 0.0
    for a in assets:
        # Using cost_basis for now; can replace with live prices later
        total += a.cost_basis

    return total

# Run the app (for development)
if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)