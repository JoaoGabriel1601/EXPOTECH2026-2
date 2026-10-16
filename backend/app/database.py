from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.settings import Settings


def build_session_factory(settings: Settings) -> sessionmaker[Session]:
    engine = create_engine(
        settings.database_url.get_secret_value(),
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5},
        hide_parameters=True,
    )
    return sessionmaker(engine, expire_on_commit=False)
