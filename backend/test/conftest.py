"""Shared fixtures for the StockPulse backend suite."""
import os

import pytest
import sqlalchemy as sa

from app.config import Config
from app.main import create_app
from app.models import db, pwd_context


class TestConfig(Config):
    """Configuration for the test suite.

    TEST_DATABASE_URL lets CI point at a real Postgres 15 service container so
    tests exercise the same engine and driver as production. Locally it falls
    back to in-memory SQLite for a fast feedback loop.

    Defined here rather than in a test module on purpose: `python_classes =
    Test*` would otherwise make pytest try to collect it as a test class.
    """

    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")
    SECRET_KEY = "test-secret-key"
    JWT_EXPIRATION_HOURS = 1

    # NOTE: do NOT set RATELIMIT_ENABLED = False here. Flask-Limiter's
    # init_app() returns early on that flag, before it registers itself in
    # app.extensions["limiter"] — and the @limiter.limit decorators hold only a
    # weakref.proxy to the Limiter. Since main.py's `limiter` is a local inside
    # create_app, disabling it leaves nothing holding a strong reference: the
    # Limiter is garbage collected and every decorated route then raises
    # "ReferenceError: weakly-referenced object no longer exists".
    # Rate limits are instead kept harmless by the function-scoped `app`
    # fixture — see its docstring.


# passlib's default bcrypt cost is 12 rounds (~300ms per hash). Every app
# creation seeds the demo user and most tests register + log in, so that is
# ~3 hashes per test. 4 is bcrypt's documented minimum. Test-only.
pwd_context.update(bcrypt__rounds=4)


@pytest.fixture(scope="session", autouse=True)
def _clean_database():
    """Drop leftover tables once, before the first test.

    create_app() calls db.create_all(), which is checkfirst=True: if a previous
    run was killed before teardown its rows would silently survive into this
    run. Irrelevant for in-memory SQLite (every engine gets a private database)
    but essential for a reused Postgres instance.
    """
    url = TestConfig.SQLALCHEMY_DATABASE_URI
    if url.startswith("sqlite"):
        yield
        return

    engine = sa.create_engine(url)
    try:
        # drop_all emits DROPs in reverse FK-dependency order with
        # checkfirst=True, so ordering and missing tables are both handled.
        db.metadata.drop_all(engine)
    finally:
        engine.dispose()
    yield


@pytest.fixture
def app():
    """A fresh application, and therefore a fresh database, per test.

    Function scope is load-bearing, for two reasons:

    1. Rate limits. create_app builds its own Limiter with memory:// storage,
       so a new app means virgin counters. Every test stays under the tightest
       limit on the endpoints it touches (the binding one is POST /api/register
       at "3 per hour"). A session-scoped app would accumulate counters across
       tests and start returning 429 — and the limiter cannot simply be
       disabled, see the note on TestConfig above.
    2. Database isolation. In-memory SQLite gives each app a private database
       (StaticPool), but on a reused Postgres the drop_all teardown below is
       what actually provides isolation.
    """
    application = create_app(TestConfig)
    # create_app already ran db.create_all() + _seed_demo_user() in its own
    # app context; this one exists so teardown has a context to run in.
    with application.app_context():
        yield application
        # Release this context's session before DDL so no open transaction
        # holds a lock on the tables being dropped. Each request's session is
        # already removed by Flask-SQLAlchemy's teardown_appcontext.
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def make_user(client):
    """Factory: register + log in a user, return its Bearer auth header."""

    def _make(email, password="TestPass123!"):
        response = client.post("/api/register", json={"email": email, "password": password})
        assert response.status_code == 201, response.get_json()
        response = client.post("/api/login", json={"email": email, "password": password})
        assert response.status_code == 200, response.get_json()
        return {"Authorization": f"Bearer {response.get_json()['token']}"}

    return _make


@pytest.fixture
def auth_headers(make_user):
    return make_user("test@example.com")
