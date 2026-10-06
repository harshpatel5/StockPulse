"""
Smoke suite for the StockPulse API — intentionally small.

Covers the paths whose regressions have actually broken production (app boot /
dependency drift, demo login, token validation on refresh) plus the asset CRUD
and ownership contract the frontend depends on.

Deliberately avoids /api/prices/*, /api/crypto/*, /api/portfolio/* and
/api/benchmark/* — those make real Finnhub/CoinGecko calls. Use
scripts/manual_api_check.py against a running server for those.
"""


def test_app_boots_and_reports_status(client):
    """Catches import/dependency breakage and a dead app factory."""
    response = client.get("/api/status")
    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "online"
    assert "version" in body


def test_register_login_me_roundtrip(client):
    """register -> login -> /api/me with the returned Bearer token."""
    credentials = {"email": "roundtrip@example.com", "password": "TestPass123!"}

    response = client.post("/api/register", json=credentials)
    assert response.status_code == 201, response.get_json()
    assert response.get_json()["user"]["email"] == credentials["email"]

    response = client.post("/api/login", json=credentials)
    assert response.status_code == 200, response.get_json()
    token = response.get_json()["token"]
    assert token

    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200, response.get_json()
    user = response.get_json()["user"]
    assert user["email"] == credentials["email"]
    assert user["is_demo"] is False


# The next two checks are separate tests on purpose. POST /api/register is
# limited to "3 per hour" and the limiter is live (see conftest), so each test
# gets a fresh app and a fresh counter. Keep register calls per test well
# under 3.


def test_register_rejects_missing_password(client):
    # Always send a JSON body: a bodyless POST makes request.get_json() raise
    # UnsupportedMediaType, which register()'s bare `except Exception` turns
    # into a 500 rather than a 400.
    response = client.post("/api/register", json={"email": "nopass@example.com"})
    assert response.status_code == 400


def test_register_rejects_duplicate_email(client):
    credentials = {"email": "dup@example.com", "password": "TestPass123!"}
    assert client.post("/api/register", json=credentials).status_code == 201
    response = client.post("/api/register", json=credentials)
    assert response.status_code == 409
    assert response.get_json()["message"] == "User already exists"


def test_me_rejects_invalid_tokens(client):
    """Guards the 'redirect to login before the stored token is validated' bug."""
    assert client.get("/api/me").status_code == 401
    assert client.get(
        "/api/me", headers={"Authorization": "Bearer not-a-jwt"}
    ).status_code == 401
    # auth.py only parses the 'Bearer ' prefix; a bare token must not be accepted.
    assert client.get("/api/me", headers={"Authorization": "not-a-jwt"}).status_code == 401


def test_demo_login_returns_read_only_session(client):
    """Demo account must be seeded, usable, and write-protected."""
    response = client.post("/api/demo-login")
    assert response.status_code == 200, response.get_json()
    body = response.get_json()
    assert body["token"]
    assert body["user"]["is_demo"] is True

    headers = {"Authorization": f"Bearer {body['token']}"}
    response = client.post(
        "/api/assets",
        headers=headers,
        json={"name": "AAPL", "type": "Stock", "quantity": 1, "cost_basis": 100},
    )
    assert response.status_code == 403
    assert response.get_json()["message"] == "Demo account is read-only"


def test_asset_crud_roundtrip(client, auth_headers):
    """POST -> GET list -> PUT -> DELETE -> GET list empty."""
    response = client.post(
        "/api/assets",
        headers=auth_headers,
        json={"name": "AAPL", "type": "Stock", "quantity": 10, "cost_basis": 1500.0},
    )
    assert response.status_code == 201, response.get_json()
    asset_id = response.get_json()["asset"]["id"]

    # GET /api/assets returns a bare JSON array, and the seeded demo user's
    # assets must not leak into it.
    response = client.get("/api/assets", headers=auth_headers)
    assert response.status_code == 200
    assert [(a["name"], a["type"]) for a in response.get_json()] == [("AAPL", "Stock")]

    response = client.put(
        f"/api/assets/{asset_id}",
        headers=auth_headers,
        json={"quantity": 15, "cost_basis": 2250.0},
    )
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["asset"]["quantity"] == 15

    # No body: current_value is documented as optional and must fall back to
    # cost_basis. The frontend really does send a body-less DELETE whenever the
    # asset is missing from its local list (useAssets.js leaves currentValue
    # null), so this path has to work.
    response = client.delete(f"/api/assets/{asset_id}", headers=auth_headers)
    assert response.status_code == 200, response.get_json()

    response = client.get("/api/assets", headers=auth_headers)
    assert response.status_code == 200
    assert response.get_json() == []


def test_delete_asset_accepts_current_value(client, auth_headers):
    """The with-body DELETE path, which records an accurate capital outflow."""
    response = client.post(
        "/api/assets",
        headers=auth_headers,
        json={"name": "TSLA", "type": "Stock", "quantity": 5, "cost_basis": 1000.0},
    )
    assert response.status_code == 201, response.get_json()
    asset_id = response.get_json()["asset"]["id"]

    response = client.delete(
        f"/api/assets/{asset_id}", headers=auth_headers, json={"current_value": 1400.0}
    )
    assert response.status_code == 200, response.get_json()
    assert client.get("/api/assets", headers=auth_headers).get_json() == []


def test_create_asset_requires_all_fields(client, auth_headers):
    response = client.post(
        "/api/assets", headers=auth_headers, json={"name": "AAPL", "type": "Stock"}
    )
    assert response.status_code == 400


def test_assets_are_scoped_to_their_owner(client, auth_headers, make_user):
    """User B must not be able to reach user A's asset."""
    response = client.post(
        "/api/assets",
        headers=auth_headers,
        json={"name": "NVDA", "type": "Stock", "quantity": 2, "cost_basis": 900.0},
    )
    assert response.status_code == 201, response.get_json()
    asset_id = response.get_json()["asset"]["id"]

    other_headers = make_user("intruder@example.com")
    # One GET suffices: manage_single_asset does a single ownership-scoped
    # lookup shared by GET, PUT and DELETE.
    response = client.get(f"/api/assets/{asset_id}", headers=other_headers)
    assert response.status_code == 404
    assert response.get_json()["message"] == "Asset not found or access denied"


def test_history_update_then_read(client, auth_headers):
    """Always send total_value: without it the route calls live price APIs."""
    response = client.post(
        "/api/history/update", headers=auth_headers, json={"total_value": 12345.67}
    )
    assert response.status_code == 200, response.get_json()
    assert response.get_json()["total_value"] == 12345.67

    response = client.get("/api/history", headers=auth_headers)
    assert response.status_code == 200
    body = response.get_json()
    # generate_portfolio_chart_data swallows every exception and still returns
    # 200 with {"raw": [], "growth": []}, so assert on content, not just keys.
    # >= 1 and [-1] rather than == 1 and [0]: if the POST lands just before UTC
    # midnight and the GET just after, the forward-fill adds a second point.
    assert len(body["raw"]) >= 1
    assert len(body["growth"]) >= 1
    assert body["raw"][-1]["total_value"] == 12345.67
