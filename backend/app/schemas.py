from datetime import UTC, datetime, timedelta
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=256)


class SessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TelemetryInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    message_id: UUID
    measured_at: AwareDatetime
    occupancy: int = Field(ge=0, le=10000, strict=True)
    temp_inside: float = Field(ge=-40, le=85)
    temp_outside: float = Field(ge=-40, le=85)
    target_temp: float = Field(ge=0, le=30)
    humidity_inside: float = Field(ge=0, le=100)
    humidity_outside: float = Field(ge=0, le=100)
    ac_on: bool = Field(strict=True)
    manual_mode: bool = Field(strict=True)

    @field_validator("target_temp")
    @classmethod
    def target_range(cls, value: float) -> float:
        if value != 0 and value < 16:
            raise ValueError("Alvo deve ser zero ou estar entre 16 e 30 °C")
        return value

    @field_validator("measured_at")
    @classmethod
    def reasonable_timestamp(cls, value: datetime) -> datetime:
        if value > datetime.now(UTC) + timedelta(seconds=60):
            raise ValueError("Horário da medição está no futuro")
        return value.astimezone(UTC)


class ReadingResponse(TelemetryInput):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    room_id: str
    device_id: str
    received_at: AwareDatetime


class TelemetryReceipt(BaseModel):
    duplicate: bool
    reading: ReadingResponse


class LatestResponse(BaseModel):
    reading: ReadingResponse | None
    age_seconds: float | None
    is_stale: bool
