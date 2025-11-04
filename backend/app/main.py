from flask import Flask, jsonify, request
from flask_cors import CORS
#from app.models import db, User, Asset
#from app.auth import generate_token, token_required
from auth import generate_token, token_required
from models import db, User, Asset
from config import Config
#from app.config import Config
from sqlalchemy import exc


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
    
    # Initialize database
    db.init_app(app)
    
    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        print("✓ Database tables created successfully!")
    
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