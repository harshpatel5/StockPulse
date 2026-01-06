"""
Basic smoke tests for StockPulse API
Tests critical paths: authentication, assets, and portfolio calculations
"""
import pytest
import json
from app.main import create_app
from app.models import db, User, Asset
from app.config import Config


class TestConfig(Config):
    """Test configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SECRET_KEY = 'test-secret-key'


@pytest.fixture
def app():
    """Create test app with in-memory database"""
    app = create_app(TestConfig)
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """Register a user and return auth headers"""
    # Register user
    response = client.post('/api/register', 
        json={
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!'
        })
    assert response.status_code == 201
    
    # Login
    response = client.post('/api/login',
        json={
            'email': 'test@example.com',
            'password': 'TestPass123!'
        })
    assert response.status_code == 200
    data = json.loads(response.data)
    token = data['token']
    
    return {'Authorization': f'Bearer {token}'}


class TestHealthCheck:
    """Test API health check"""
    
    def test_status_endpoint(self, client):
        """Test that API is online"""
        response = client.get('/api/status')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'online'
        assert 'version' in data


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_register_success(self, client):
        """Test successful user registration"""
        response = client.post('/api/register',
            json={
                'username': 'newuser',
                'email': 'new@example.com',
                'password': 'Password123!'
            })
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['message'] == 'User registered successfully'
    
    def test_register_duplicate_username(self, client):
        """Test registering with duplicate username"""
        # First registration
        client.post('/api/register',
            json={
                'username': 'duplicate',
                'email': 'first@example.com',
                'password': 'Pass123!'
            })
        
        # Second registration with same username
        response = client.post('/api/register',
            json={
                'username': 'duplicate',
                'email': 'second@example.com',
                'password': 'Pass123!'
            })
        assert response.status_code == 400
    
    def test_login_success(self, client):
        """Test successful login"""
        # Register first
        client.post('/api/register',
            json={
                'username': 'loginuser',
                'email': 'login@example.com',
                'password': 'Pass123!'
            })
        
        # Login
        response = client.post('/api/login',
            json={
                'email': 'login@example.com',
                'password': 'Pass123!'
            })
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'token' in data
        assert data['username'] == 'loginuser'
    
    def test_login_invalid_credentials(self, client):
        """Test login with wrong password"""
        # Register first
        client.post('/api/register',
            json={
                'username': 'testuser',
                'email': 'test@example.com',
                'password': 'CorrectPass123!'
            })
        
        # Try login with wrong password
        response = client.post('/api/login',
            json={
                'email': 'test@example.com',
                'password': 'WrongPass123!'
            })
        assert response.status_code == 401


class TestAssetManagement:
    """Test asset CRUD operations"""
    
    def test_add_stock_asset(self, client, auth_headers):
        """Test adding a stock asset"""
        response = client.post('/api/assets',
            headers=auth_headers,
            json={
                'symbol': 'AAPL',
                'quantity': 10,
                'cost_basis': 1500.00,
                'asset_type': 'stock'
            })
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['message'] == 'Asset added'
        assert 'asset_id' in data
    
    def test_add_crypto_asset(self, client, auth_headers):
        """Test adding a crypto asset"""
        response = client.post('/api/assets',
            headers=auth_headers,
            json={
                'symbol': 'BTC',
                'quantity': 0.5,
                'cost_basis': 25000.00,
                'asset_type': 'crypto'
            })
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['message'] == 'Asset added'
    
    def test_get_assets(self, client, auth_headers):
        """Test retrieving user assets"""
        # Add an asset first
        client.post('/api/assets',
            headers=auth_headers,
            json={
                'symbol': 'GOOGL',
                'quantity': 5,
                'cost_basis': 750.00,
                'asset_type': 'stock'
            })
        
        # Get assets
        response = client.get('/api/assets', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'assets' in data
        assert len(data['assets']) > 0
        assert data['assets'][0]['symbol'] == 'GOOGL'
    
    def test_update_asset(self, client, auth_headers):
        """Test updating an asset"""
        # Add asset
        response = client.post('/api/assets',
            headers=auth_headers,
            json={
                'symbol': 'MSFT',
                'quantity': 10,
                'cost_basis': 3000.00,
                'asset_type': 'stock'
            })
        data = json.loads(response.data)
        asset_id = data['asset_id']
        
        # Update asset
        response = client.put(f'/api/assets/{asset_id}',
            headers=auth_headers,
            json={
                'quantity': 15,
                'cost_basis': 4500.00
            })
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Asset updated'
    
    def test_delete_asset(self, client, auth_headers):
        """Test deleting an asset"""
        # Add asset
        response = client.post('/api/assets',
            headers=auth_headers,
            json={
                'symbol': 'TSLA',
                'quantity': 5,
                'cost_basis': 1000.00,
                'asset_type': 'stock'
            })
        data = json.loads(response.data)
        asset_id = data['asset_id']
        
        # Delete asset
        response = client.delete(f'/api/assets/{asset_id}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Asset deleted'


class TestPortfolioHistory:
    """Test portfolio history endpoints"""
    
    def test_update_portfolio_history(self, client, auth_headers):
        """Test updating portfolio history"""
        response = client.post('/api/history/update',
            headers=auth_headers,
            json={'total_value': 10000.00})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'History updated'
        assert data['total_value'] == 10000.00
    
    def test_get_portfolio_history(self, client, auth_headers):
        """Test retrieving portfolio history"""
        # Add history first
        client.post('/api/history/update',
            headers=auth_headers,
            json={'total_value': 5000.00})
        
        # Get history
        response = client.get('/api/history', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'history' in data
        assert len(data['history']) > 0


class TestPriceEndpoints:
    """Test price fetching endpoints"""
    
    def test_get_quote_without_api_key(self, client, auth_headers):
        """Test that price endpoint handles missing API key gracefully"""
        response = client.get('/api/prices/quote/AAPL', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        # Should return message about missing API key
        assert 'message' in data or 'price' in data
    
    def test_batch_quotes_without_api_key(self, client, auth_headers):
        """Test batch price endpoint without API key"""
        response = client.post('/api/prices/batch',
            headers=auth_headers,
            json={'symbols': ['AAPL', 'GOOGL']})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'prices' in data or 'message' in data
    
    def test_search_symbols_without_api_key(self, client, auth_headers):
        """Test symbol search without API key"""
        response = client.get('/api/prices/search?q=apple', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'results' in data or 'message' in data


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
