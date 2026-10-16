import json
from pathlib import Path

import pytest

from app import localdev


def temporary_paths(monkeypatch, tmp_path):
    backend = tmp_path / "backend"
    local = tmp_path / ".local" / "postgres-dev"
    backend.mkdir()
    monkeypatch.setattr(localdev, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(localdev, "BACKEND", backend)
    monkeypatch.setattr(localdev, "LOCAL", local)
    monkeypatch.setattr(localdev, "DATA", local / "data")
    monkeypatch.setattr(localdev, "INSTANCE_FILE", local / "instance.json")
    return backend, local


def test_setup_preserves_existing_backend_configuration(monkeypatch, tmp_path):
    backend, _ = temporary_paths(monkeypatch, tmp_path)
    original = "PRIVATE_EXISTING_CONFIGURATION=true\n"
    (backend / ".env").write_text(original, encoding="utf-8")
    with pytest.raises(localdev.LocalSetupError, match="backend/.env já existe"):
        localdev.setup(5433, None)
    assert (backend / ".env").read_text(encoding="utf-8") == original


def test_setup_preserves_unrecognized_database_directory(monkeypatch, tmp_path):
    _, local = temporary_paths(monkeypatch, tmp_path)
    data = local / "data"
    data.mkdir(parents=True)
    marker = data / "existing-data"
    marker.write_text("preserve", encoding="utf-8")
    with pytest.raises(localdev.LocalSetupError, match="Diretório de dados já existe"):
        localdev.setup(5433, None)
    assert marker.read_text(encoding="utf-8") == "preserve"


def test_instance_from_another_project_is_rejected(monkeypatch, tmp_path):
    _, local = temporary_paths(monkeypatch, tmp_path)
    local.mkdir(parents=True)
    (local / "instance.json").write_text(
        json.dumps(
            {
                "project_root": str(tmp_path / "another-project"),
                "port": 5433,
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(localdev.LocalSetupError, match="outro caminho"):
        localdev.load_instance()


def test_postgres_process_does_not_capture_inherited_pipes(monkeypatch, tmp_path):
    temporary_paths(monkeypatch, tmp_path)
    calls = []

    def execute(arguments, **kwargs):
        calls.append((arguments, kwargs))
        return type("Result", (), {"returncode": 0})()

    monkeypatch.setattr(localdev.subprocess, "run", execute)
    localdev.run_postgres(Path("pg_ctl.exe"), "status")
    assert "capture_output" not in calls[0][1]
    assert calls[0][1]["stdout"] is not localdev.subprocess.PIPE
