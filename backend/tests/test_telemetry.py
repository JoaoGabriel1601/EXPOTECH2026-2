from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app.models import Device, SensorReading


def sample(**changes):
    return {
        "message_id": str(uuid4()),
        "measured_at": datetime.now(UTC).isoformat(),
        "occupancy": 8,
        "temp_inside": 27.5,
        "temp_outside": 32.0,
        "target_temp": 21.0,
        "humidity_inside": 55.0,
        "humidity_outside": 62.0,
        "ac_on": False,
        "manual_mode": True,
        **changes,
    }


def publish(context, payload):
    return context["client"].post("/telemetry", json=payload, headers=context["device_headers"])


def test_round_trip_persists_actual_ac_state(context):
    response = publish(context, sample())
    assert response.status_code == 201
    receipt = response.json()
    assert receipt["duplicate"] is False
    assert receipt["reading"]["device_id"] == context["device"]
    latest = (
        context["client"]
        .get(f"/rooms/{context['room']}/latest", headers=context["operator_headers"])
        .json()
    )
    assert latest["reading"]["id"] == receipt["reading"]["id"]
    assert latest["reading"]["ac_on"] is False
    assert latest["reading"]["target_temp"] == 21
    assert latest["is_stale"] is False


def test_retry_is_idempotent_and_changed_payload_conflicts(context):
    payload = sample()
    first = publish(context, payload)
    retry = publish(context, payload)
    assert retry.status_code == 200
    assert retry.json()["duplicate"] is True
    assert retry.json()["reading"]["id"] == first.json()["reading"]["id"]
    assert publish(context, {**payload, "occupancy": 9}).status_code == 409
    with context["app"].state.sessions() as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(SensorReading)
                .where(SensorReading.device_id == context["device"])
            )
            == 1
        )


def test_concurrent_retries_create_only_one_reading(context):
    payload = sample()
    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(executor.map(lambda _: publish(context, payload), range(4)))
    assert sorted(response.status_code for response in responses) == [200, 200, 200, 201]
    assert len({response.json()["reading"]["id"] for response in responses}) == 1


def test_latest_uses_measurement_time_and_history_is_ordered(context):
    now = datetime.now(UTC)
    for minutes in [3, 1, 2]:
        assert (
            publish(
                context,
                sample(
                    measured_at=(now - timedelta(minutes=minutes)).isoformat(), occupancy=minutes
                ),
            ).status_code
            == 201
        )
    client, headers = context["client"], context["operator_headers"]
    latest = client.get(f"/rooms/{context['room']}/latest", headers=headers).json()
    assert latest["reading"]["occupancy"] == 1
    history = client.get(f"/rooms/{context['room']}/history?limit=2", headers=headers).json()
    assert [reading["occupancy"] for reading in history] == [2, 1]
    filtered = client.get(
        f"/rooms/{context['room']}/history",
        params={"since": (now - timedelta(seconds=90)).isoformat()},
        headers=headers,
    ).json()
    assert len(filtered) == 1


def test_stale_feed_and_empty_room(context):
    endpoint = f"/rooms/{context['room']}/latest"
    empty = context["client"].get(endpoint, headers=context["operator_headers"]).json()
    assert empty == {"reading": None, "age_seconds": None, "is_stale": True}
    publish(context, sample(measured_at=(datetime.now(UTC) - timedelta(minutes=5)).isoformat()))
    result = context["client"].get(endpoint, headers=context["operator_headers"]).json()
    assert result["is_stale"] is True
    assert result["age_seconds"] >= 300


@pytest.mark.parametrize(
    "change",
    [
        {"occupancy": -1},
        {"occupancy": 2.5},
        {"humidity_inside": 101},
        {"temp_inside": -41},
        {"target_temp": 15},
        {"ac_on": "false"},
        {"measured_at": "2026-01-01T12:00:00"},
        {"room_id": "spoofed"},
        {"measured_at": (datetime.now(UTC) + timedelta(days=1)).isoformat()},
    ],
)
def test_invalid_payload_is_rejected(context, change):
    assert publish(context, sample(**change)).status_code == 422


def test_disabled_device_is_rejected(context):
    with context["app"].state.sessions() as session:
        device = session.get(Device, context["device"])
        device.enabled = False
        session.commit()
    assert publish(context, sample()).status_code == 401


def test_credentials_are_scoped_and_queries_require_login(context):
    client = context["client"]
    endpoint = f"/rooms/{context['room']}/latest"
    assert client.get(endpoint).status_code == 401
    assert client.get(endpoint, headers=context["device_headers"]).status_code == 401
    assert (
        client.post("/telemetry", json=sample(), headers=context["operator_headers"]).status_code
        == 401
    )
    assert client.post("/telemetry", json=sample()).status_code == 401
    assert (
        client.post("/auth/login", json={"username": "admin", "password": "wrong"}).status_code
        == 401
    )
    assert client.get(endpoint, headers={"Authorization": "Bearer tampered"}).status_code == 401


def test_health_limits_unknown_room_and_cache(context):
    client, headers = context["client"], context["operator_headers"]
    assert client.get("/health").status_code == 200
    assert client.get("/ready").status_code == 200
    assert client.get("/rooms/unknown/latest", headers=headers).status_code == 404
    assert (
        client.get(f"/rooms/{context['room']}/history?limit=2001", headers=headers).status_code
        == 422
    )
    assert client.get("/health").headers["cache-control"] == "no-store"
