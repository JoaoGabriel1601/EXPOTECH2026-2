"""Publica uma leitura simulada na API; nunca imprime a credencial do dispositivo."""

import argparse
import getpass
import json
import os
from datetime import UTC, datetime
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from uuid import uuid4


def main():
    parser = argparse.ArgumentParser(description="Enviar telemetria simulada ao Movement")
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    parsed = urlparse(args.url)
    if parsed.scheme != "https" and not (
        parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}
    ):
        parser.error("Use HTTPS; HTTP é permitido apenas em localhost")
    token = os.environ.get("MOVEMENT_DEVICE_TOKEN") or getpass.getpass("Token do dispositivo: ")
    payload = {
        "message_id": str(uuid4()),
        "measured_at": datetime.now(UTC).isoformat(),
        "occupancy": 8,
        "temp_inside": 27.5,
        "temp_outside": 32.0,
        "target_temp": 21.0,
        "humidity_inside": 55.0,
        "humidity_outside": 62.0,
        "ac_on": True,
        "manual_mode": False,
    }
    request = Request(
        f"{args.url.rstrip('/')}/telemetry",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=10) as response:
            result = json.load(response)
            print(f"Leitura simulada armazenada: {result['reading']['id']}")
    except HTTPError as error:
        parser.exit(1, f"API recusou a leitura: HTTP {error.code}\n")


if __name__ == "__main__":
    main()
