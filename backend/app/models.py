from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Room(Base):
    __tablename__ = "rooms"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))


class Device(Base):
    __tablename__ = "devices"
    # Um dispositivo ativo por ambiente nesta primeira entrega.
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id"), unique=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    __table_args__ = (
        UniqueConstraint("device_id", "message_id", name="uq_reading_device_message"),
        Index("ix_readings_room_measured", "room_id", "measured_at"),
        CheckConstraint("occupancy >= 0", name="ck_reading_occupancy"),
        CheckConstraint("temp_inside BETWEEN -40 AND 85", name="ck_reading_temp_inside"),
        CheckConstraint("temp_outside BETWEEN -40 AND 85", name="ck_reading_temp_outside"),
        CheckConstraint("humidity_inside BETWEEN 0 AND 100", name="ck_reading_humidity_inside"),
        CheckConstraint("humidity_outside BETWEEN 0 AND 100", name="ck_reading_humidity_outside"),
        CheckConstraint(
            "target_temp = 0 OR target_temp BETWEEN 16 AND 30", name="ck_reading_target"
        ),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    message_id: Mapped[UUID] = mapped_column(Uuid)
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id"))
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    occupancy: Mapped[int] = mapped_column(Integer)
    temp_inside: Mapped[float] = mapped_column(Float)
    temp_outside: Mapped[float] = mapped_column(Float)
    target_temp: Mapped[float] = mapped_column(Float)
    humidity_inside: Mapped[float] = mapped_column(Float)
    humidity_outside: Mapped[float] = mapped_column(Float)
    ac_on: Mapped[bool] = mapped_column(Boolean)
    manual_mode: Mapped[bool] = mapped_column(Boolean)
