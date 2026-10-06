"""
Manual test script for StockPulse API
Run this after starting the Flask server to verify all endpoints work
"""
import requests
import json

BASE_URL = "http://localhost:5000"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'


def print_result(test_name, passed, details=""):
    """Print test result with color"""
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"{status} - {test_name}")
    if details:
        print(f"  {details}")


def test_health_check():
    """Test API health check"""
    try:
        response = requests.get(f"{BASE_URL}/api/status")
        passed = response.status_code == 200 and response.json().get('status') == 'online'
        print_result("Health Check", passed, f"Status: {response.json().get('status')}")
        return passed
    except Exception as e:
        print_result("Health Check", False, f"Error: {str(e)}")
        return False


def test_register_login():
    """Test user registration and login"""
    try:
        # Register
        register_data = {
            "username": "testuser_manual",
            "email": "testmanual@example.com",
            "password": "TestPass123!"
        }
        response = requests.post(f"{BASE_URL}/api/register", json=register_data)
        
        # If user exists (409), try login directly
        if response.status_code == 409 or response.status_code == 400:
            print_result("Register User", True, "User already exists, proceeding to login")
        else:
            passed = response.status_code == 201
            print_result("Register User", passed, f"Status: {response.status_code}")
            if not passed:
                return None
        
        # Login
        login_data = {
            "email": "testmanual@example.com",
            "password": "TestPass123!"
        }
        response = requests.post(f"{BASE_URL}/api/login", json=login_data)
        passed = response.status_code == 200
        
        if passed:
            token = response.json().get('token')
            print_result("Login User", True, f"Token received: {token[:20]}...")
            return token
        else:
            print_result("Login User", False, f"Status: {response.status_code}")
            return None
            
    except Exception as e:
        print_result("Register/Login", False, f"Error: {str(e)}")
        return None


def test_add_asset(token):
    """Test adding an asset"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        asset_data = {
            "name": "AAPL",
            "type": "stock",
            "quantity": 10,
            "cost_basis": 1500.00
        }
        response = requests.post(f"{BASE_URL}/api/assets", json=asset_data, headers=headers)
        passed = response.status_code == 201
        
        if passed:
            asset_data = response.json()
            # Extract id from asset object in response
            asset_id = asset_data.get('asset', {}).get('id') if 'asset' in asset_data else asset_data.get('asset_id')
            print_result("Add Asset", True, f"Asset ID: {asset_id}")
            return asset_id
        else:
            print_result("Add Asset", False, f"Status: {response.status_code}, {response.text}")
            return None
            
    except Exception as e:
        print_result("Add Asset", False, f"Error: {str(e)}")
        return None


def test_get_assets(token):
    """Test retrieving assets"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/assets", headers=headers)
        passed = response.status_code == 200
        
        if passed:
            assets = response.json()
            print_result("Get Assets", True, f"Found {len(assets)} asset(s)")
            return True
        else:
            print_result("Get Assets", False, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_result("Get Assets", False, f"Error: {str(e)}")
        return False


def test_update_asset(token, asset_id):
    """Test updating an asset"""
    if not asset_id:
        print_result("Update Asset", False, "No asset ID provided")
        return False
        
    try:
        headers = {"Authorization": f"Bearer {token}"}
        update_data = {
            "quantity": 15,
            "cost_basis": 2250.00
        }
        response = requests.put(f"{BASE_URL}/api/assets/{asset_id}", json=update_data, headers=headers)
        passed = response.status_code == 200
        print_result("Update Asset", passed, f"Status: {response.status_code}")
        return passed
        
    except Exception as e:
        print_result("Update Asset", False, f"Error: {str(e)}")
        return False


def test_portfolio_history(token):
    """Test portfolio history update and retrieval"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Update history
        history_data = {"total_value": 10000.00}
        response = requests.post(f"{BASE_URL}/api/history/update", json=history_data, headers=headers)
        passed = response.status_code == 200
        print_result("Update Portfolio History", passed, f"Status: {response.status_code}")
        
        if not passed:
            return False
        
        # Get history
        response = requests.get(f"{BASE_URL}/api/history", headers=headers)
        passed = response.status_code == 200
        
        if passed:
            history = response.json()
            # Handle both list and dict with 'history' key
            if isinstance(history, dict) and 'history' in history:
                history = history['history']
            print_result("Get Portfolio History", True, f"Found {len(history)} record(s)")
            return True
        else:
            print_result("Get Portfolio History", False, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_result("Portfolio History", False, f"Error: {str(e)}")
        return False


def test_price_endpoints(token):
    """Test price fetching endpoints"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test quote endpoint
        response = requests.get(f"{BASE_URL}/api/prices/quote/AAPL", headers=headers)
        passed = response.status_code == 200
        print_result("Get Price Quote", passed, f"Response: {response.json()}")
        
        # Test batch quotes
        batch_data = {"symbols": ["AAPL", "GOOGL"]}
        response = requests.post(f"{BASE_URL}/api/prices/batch", json=batch_data, headers=headers)
        passed = response.status_code == 200
        print_result("Get Batch Quotes", passed, f"Status: {response.status_code}")
        
        # Test search
        response = requests.get(f"{BASE_URL}/api/prices/search?q=apple", headers=headers)
        passed = response.status_code == 200
        print_result("Search Symbols", passed, f"Status: {response.status_code}")
        
        return True
        
    except Exception as e:
        print_result("Price Endpoints", False, f"Error: {str(e)}")
        return False


def test_crypto_endpoints(token):
    """Test crypto endpoints"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test crypto quote
        response = requests.get(f"{BASE_URL}/api/crypto/quote/BTC", headers=headers)
        passed = response.status_code == 200
        print_result("Get Crypto Quote", passed, f"Response: {response.json()}")
        
        # Test crypto search
        response = requests.get(f"{BASE_URL}/api/crypto/search?q=bitcoin", headers=headers)
        passed = response.status_code == 200
        print_result("Search Crypto", passed, f"Status: {response.status_code}")
        
        return True
        
    except Exception as e:
        print_result("Crypto Endpoints", False, f"Error: {str(e)}")
        return False


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("StockPulse API Manual Test Suite")
    print("="*60 + "\n")
    
    # Check if server is running
    print(f"{YELLOW}Testing connection to {BASE_URL}...{RESET}\n")
    
    if not test_health_check():
        print(f"\n{RED}ERROR: Server is not running!{RESET}")
        print(f"Please start the Flask server first: python backend/app/main.py")
        return
    
    print(f"\n{YELLOW}Running authentication tests...{RESET}\n")
    token = test_register_login()
    
    if not token:
        print(f"\n{RED}ERROR: Authentication failed! Cannot proceed with other tests.{RESET}")
        return
    
    print(f"\n{YELLOW}Running asset management tests...{RESET}\n")
    asset_id = test_add_asset(token)
    test_get_assets(token)
    test_update_asset(token, asset_id)
    
    print(f"\n{YELLOW}Running portfolio history tests...{RESET}\n")
    test_portfolio_history(token)
    
    print(f"\n{YELLOW}Running price API tests...{RESET}\n")
    test_price_endpoints(token)
    
    print(f"\n{YELLOW}Running crypto API tests...{RESET}\n")
    test_crypto_endpoints(token)
    
    print("\n" + "="*60)
    print(f"{GREEN}Test suite completed!{RESET}")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
