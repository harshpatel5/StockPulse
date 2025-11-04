import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from app.models import User


def generate_token(user_id):
    """
    Create a JWT token for authenticated user
    Token contains user_id and expiration time
    """
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=current_app.config['JWT_EXPIRATION_HOURS']),
        'iat': datetime.utcnow()  # Issued at time
    }
    
    token = jwt.encode(
        payload,
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    return token


def token_required(f):
    """
    Decorator to protect routes that require authentication
    Usage: @token_required above any route function
    
    HOW IT WORKS:
    1. Extracts token from 'Authorization: Bearer <token>' header
    2. Verifies token signature and expiration
    3. Loads user from database
    4. Passes user to the route function
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Authentication token is missing'}), 401
        
        try:
            # Decode and verify token
            data = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=["HS256"]
            )
            
            # Load user from database
            current_user = User.query.filter_by(id=data['user_id']).first()
            
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'message': f'Token validation error: {str(e)}'}), 401
        
        # Pass current_user to the route function
        return f(current_user, *args, **kwargs)
    
    return decorated