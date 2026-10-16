import hmac
from collections.abc import Iterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import AwareDatetime
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import build_session_factory
from app.models import Device
from app.repository import DuplicateConflict, PostgresTelemetryRepository, room_exists
from app.schemas import (
    LatestResponse,
    LoginRequest,
    ReadingResponse,
    SessionResponse,
    TelemetryInput,
    TelemetryReceipt,
)
from app.security import hash_device_token, issue_session, valid_session, verify_password
from app.settings import Settings, get_settings

bearer = HTTPBearer(auto_error=False)
Credentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


def database_session(request: Request) -> Iterator[Session]:
    with request.app.state.sessions() as session:
        yield session


Db = Annotated[Session, Depends(database_session)]


def require_operator(request: Request, credentials: Credentials) -> None:
    if not credentials or not valid_session(credentials.credentials, request.app.state.settings):
        raise HTTPException(
            401, "Sessão inválida ou expirada", headers={"WWW-Authenticate": "Bearer"}
        )


def require_device(session: Db, credentials: Credentials) -> Device:
    device = None
    if credentials:
        device = session.scalar(
            select(Device).where(
                Device.token_hash == hash_device_token(credentials.credentials),
                Device.enabled.is_(True),
            )
        )
    if device is None:
        raise HTTPException(
            401, "Dispositivo não autorizado", headers={"WWW-Authenticate": "Bearer"}
        )
    return device


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or get_settings()
    sessions = build_session_factory(config)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield
        sessions.kw["bind"].dispose()

    app = FastAPI(title="Movement — API própria", version="0.1.0", lifespan=lifespan)
    app.state.settings = config
    app.state.sessions = sessions
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def prevent_sensitive_cache(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/health", tags=["Operação"])
    def health():
        return {"status": "ok", "version": "0.1.0"}

    @app.get("/ready", tags=["Operação"])
    def readiness(session: Db):
        try:
            session.execute(text("SELECT 1 FROM sensor_readings LIMIT 1"))
        except SQLAlchemyError:
            raise HTTPException(503, "Banco indisponível ou migrações pendentes") from None
        return {"status": "ready"}

    @app.post("/auth/login", response_model=SessionResponse, tags=["Autenticação"])
    def login(payload: LoginRequest):
        password_ok = verify_password(
            payload.password, config.operator_password_hash.get_secret_value()
        )
        username_ok = hmac.compare_digest(
            payload.username.encode(), config.operator_username.encode()
        )
        if not password_ok or not username_ok:
            raise HTTPException(401, "Usuário ou senha inválidos")
        return SessionResponse(
            access_token=issue_session(config), expires_in=config.session_ttl_seconds
        )

    @app.post("/telemetry", response_model=TelemetryReceipt, status_code=201, tags=["Dispositivo"])
    def telemetry(
        payload: TelemetryInput,
        response: Response,
        session: Db,
        device: Annotated[Device, Depends(require_device)],
    ):
        try:
            reading, duplicate = PostgresTelemetryRepository(session).save(device, payload)
        except DuplicateConflict:
            raise HTTPException(409, "message_id já utilizado com outra leitura") from None
        if duplicate:
            response.status_code = 200
        return TelemetryReceipt(
            duplicate=duplicate, reading=ReadingResponse.model_validate(reading)
        )

    @app.get(
        "/rooms/{room_id}/latest",
        response_model=LatestResponse,
        dependencies=[Depends(require_operator)],
        tags=["Leituras"],
    )
    def latest(room_id: str, session: Db):
        if not room_exists(session, room_id):
            raise HTTPException(404, "Ambiente não encontrado")
        reading = PostgresTelemetryRepository(session).latest(room_id)
        age = max(0, (datetime.now(UTC) - reading.measured_at).total_seconds()) if reading else None
        return LatestResponse(
            reading=ReadingResponse.model_validate(reading) if reading else None,
            age_seconds=age,
            is_stale=age is None or age > config.stale_after_seconds,
        )

    @app.get(
        "/rooms/{room_id}/history",
        response_model=list[ReadingResponse],
        dependencies=[Depends(require_operator)],
        tags=["Leituras"],
    )
    def history(
        room_id: str,
        session: Db,
        limit: Annotated[int, Query(ge=1, le=2000)] = 500,
        since: AwareDatetime | None = None,
    ):
        if not room_exists(session, room_id):
            raise HTTPException(404, "Ambiente não encontrado")
        return PostgresTelemetryRepository(session).history(room_id, limit, since)

    return app
