from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.auth import generate_token, token_required
from app.models import db, User, Asset, PortfolioHistory
from app.config import Config
from sqlalchemy import exc
from datetime import date
from apscheduler.schedulers.background import BackgroundScheduler
from app.scheduler import record_daily_snapshot, fetch_live_price, FINNHUB_KEY
import requests
import os
import logging



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
        print("✓ Database tables created successfully!")
        
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
            print("✓ APScheduler initialized - Daily snapshots enabled!")
    
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
    @limiter.limit("30 per hour")  # Allow normal asset operations
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
                    "displaySymbol": item.get('displaySymbol', item.get('symbol'))
                })
            
            return jsonify({"results": results}), 200
            
        except requests.exceptions.Timeout:
            return jsonify({"message": "Search timed out", "results": []}), 200
        except Exception as e:
            return jsonify({"message": f"Error searching symbols: {str(e)}"}), 500

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