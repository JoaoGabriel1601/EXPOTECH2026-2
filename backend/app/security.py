import hashlib
import hmac
import secrets

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.settings import Settings


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, salt, expected = encoded.split("$")
        if algorithm != "scrypt":
            return False
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1)
        return hmac.compare_digest(digest.hex(), expected)
    except (ValueError, TypeError):
        return False


def hash_device_token(token: str) -> str:
    # Tokens são aleatórios de alta entropia; apenas o hash fica no banco.
    return hashlib.sha256(token.encode()).hexdigest()


def session_serializer(settings: Settings) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        settings.session_secret.get_secret_value(), salt="movement-operator"
    )


def issue_session(settings: Settings) -> str:
    return session_serializer(settings).dumps(
        {"sub": settings.operator_username, "role": "operator"}
    )


def valid_session(token: str, settings: Settings) -> bool:
    try:
        payload = session_serializer(settings).loads(token, max_age=settings.session_ttl_seconds)
        return payload == {"sub": settings.operator_username, "role": "operator"}
    except (BadSignature, SignatureExpired):
        return False
