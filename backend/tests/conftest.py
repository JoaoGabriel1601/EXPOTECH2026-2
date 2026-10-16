import os
import secrets
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.main import create_app
from app.models import Device, Room
from app.security import hash_device_token, hash_password
from app.settings import Settings


@pytest.fixture(scope="session")
def database_url():
    raw_url = os.environ.get("MOVEMENT_TEST_DATABASE_URL")
    if not raw_url:
        pytest.fail("Defina MOVEMENT_TEST_DATABASE_URL para um banco PostgreSQL terminado em _test")
    url = make_url(raw_url)
    if url.drivername != "postgresql+psycopg" or not (url.database or "").endswith("_test"):
        pytest.fail("Os testes exigem PostgreSQL e banco separado com nome terminado em _test")
    schema = f"movement_test_{uuid4().hex}"
    engine = create_engine(url)
    with engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    scoped_url = url.update_query_dict({"options": f"-csearch_path={schema}"})
    rendered = scoped_url.render_as_string(hide_password=False)
    patch = pytest.MonkeyPatch()
    patch.setenv("MOVEMENT_DATABASE_URL", rendered)
    patch.setenv("MOVEMENT_SESSION_SECRET", secrets.token_urlsafe(32))
    patch.setenv("MOVEMENT_OPERATOR_PASSWORD_HASH", hash_password("test-password-123"))
    from app.settings import get_settings

    get_settings.cache_clear()
    try:
        config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        command.upgrade(config, "head")
        command.downgrade(config, "base")
        command.upgrade(config, "head")
        yield rendered
        command.check(config)
    finally:
        # Apenas o schema aleatório criado por esta execução é removido.
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        engine.dispose()
        patch.undo()
        get_settings.cache_clear()


@pytest.fixture
def context(database_url):
    settings = Settings(
        database_url=database_url,
        session_secret=secrets.token_urlsafe(32),
        operator_password_hash=hash_password("test-password-123"),
    )
    app = create_app(settings)
    suffix = uuid4().hex
    room_id = f"room-{suffix}"
    device_id = f"device-{suffix}"
    token = secrets.token_urlsafe(32)
    with app.state.sessions() as session:
        session.add(Room(id=room_id, name="Sala de testes"))
        session.flush()
        session.add(Device(id=device_id, room_id=room_id, token_hash=hash_device_token(token)))
        session.commit()
    with TestClient(app) as client:
        login = client.post(
            "/auth/login", json={"username": "admin", "password": "test-password-123"}
        )
        assert login.status_code == 200
        yield {
            "client": client,
            "app": app,
            "room": room_id,
            "device": device_id,
            "device_headers": {"Authorization": f"Bearer {token}"},
            "operator_headers": {"Authorization": f"Bearer {login.json()['access_token']}"},
        }
