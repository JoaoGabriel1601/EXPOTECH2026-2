import secrets
import time

from app.security import hash_password, issue_session, valid_session, verify_password
from app.settings import Settings


def test_password_hash_is_salted_and_checks_password():
    first = hash_password("operator-password")
    second = hash_password("operator-password")
    assert first != second
    assert verify_password("operator-password", first)
    assert not verify_password("wrong", first)
    assert not verify_password("operator-password", "malformed")


def test_session_expires_and_cannot_be_reused_with_another_secret(monkeypatch):
    settings = Settings(
        database_url="postgresql+psycopg://test@localhost/movement_test",
        session_secret=secrets.token_urlsafe(32),
        operator_password_hash=hash_password("operator-password"),
        session_ttl_seconds=60,
    )
    issued_at = time.time()
    token = issue_session(settings)
    assert valid_session(token, settings)
    other = settings.model_copy(update={"operator_username": "other"})
    assert not valid_session(token, other)
    other_secret = settings.model_copy(
        update={"session_secret": settings.session_secret.__class__(secrets.token_urlsafe(32))}
    )
    assert not valid_session(token, other_secret)
    monkeypatch.setattr("itsdangerous.timed.time.time", lambda: issued_at + 120)
    assert not valid_session(token, settings)
