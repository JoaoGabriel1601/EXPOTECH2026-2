from datetime import datetime
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import Device, Room, SensorReading
from app.schemas import TelemetryInput


class DuplicateConflict(Exception):
    pass


class TelemetryRepository(Protocol):
    def save(self, device: Device, payload: TelemetryInput) -> tuple[SensorReading, bool]: ...
    def latest(self, room_id: str) -> SensorReading | None: ...
    def history(self, room_id: str, limit: int, since: datetime | None) -> list[SensorReading]: ...


class PostgresTelemetryRepository:
    def __init__(self, session: Session):
        self.session = session

    def save(self, device: Device, payload: TelemetryInput) -> tuple[SensorReading, bool]:
        values = payload.model_dump()
        statement = (
            insert(SensorReading)
            .values(**values, device_id=device.id, room_id=device.room_id)
            .on_conflict_do_nothing(constraint="uq_reading_device_message")
            .returning(SensorReading)
        )
        reading = self.session.scalars(statement).first()
        duplicate = reading is None
        if duplicate:
            reading = self.session.scalar(
                select(SensorReading).where(
                    SensorReading.device_id == device.id,
                    SensorReading.message_id == payload.message_id,
                )
            )
            if any(getattr(reading, key) != value for key, value in values.items()):
                raise DuplicateConflict
        self.session.commit()
        return reading, duplicate

    def latest(self, room_id: str) -> SensorReading | None:
        return self.session.scalar(
            select(SensorReading)
            .where(SensorReading.room_id == room_id)
            .order_by(
                SensorReading.measured_at.desc(),
                SensorReading.received_at.desc(),
                SensorReading.id.desc(),
            )
            .limit(1)
        )

    def history(self, room_id: str, limit: int, since: datetime | None) -> list[SensorReading]:
        query = select(SensorReading).where(SensorReading.room_id == room_id)
        if since is not None:
            query = query.where(SensorReading.measured_at >= since)
        query = query.order_by(
            SensorReading.measured_at.desc(),
            SensorReading.received_at.desc(),
            SensorReading.id.desc(),
        ).limit(limit)
        return list(reversed(self.session.scalars(query).all()))


def room_exists(session: Session, room_id: str) -> bool:
    return session.get(Room, room_id) is not None
