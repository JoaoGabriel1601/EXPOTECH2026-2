"""Instância PostgreSQL nativa e persistente para desenvolvimento local."""

import argparse
import json
import os
import secrets
import socket
import subprocess
from pathlib import Path

import psycopg
from alembic import command
from alembic.config import Config
from psycopg import sql
from sqlalchemy.engine import URL

from app.database import build_session_factory
from app.models import Device, Room
from app.security import hash_device_token, hash_password
from app.settings import Settings

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND = PROJECT_ROOT / "backend"
LOCAL = PROJECT_ROOT / ".local" / "postgres-dev"
DATA = LOCAL / "data"
INSTANCE_FILE = LOCAL / "instance.json"


class LocalSetupError(Exception):
    pass


def run_postgres(binary: Path, *arguments: str, check: bool = True):
    # Evita abrir janelas auxiliares e mantém senhas fora da linha de comando.
    # No Windows o postgres filho pode herdar pipes de pg_ctl e impedir
    # communicate() de terminar. Um arquivo de log evita esse bloqueio.
    LOCAL.mkdir(parents=True, exist_ok=True)
    with (LOCAL / "postgres-tools.log").open("ab") as output:
        result = subprocess.run(
            [str(binary), *arguments],
            stdin=subprocess.DEVNULL,
            stdout=output,
            stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
    if check and result.returncode:
        raise LocalSetupError(
            f"{binary.name} não concluiu. Consulte {LOCAL / 'postgres-tools.log'}; "
            "nenhum arquivo de configuração existente foi removido."
        )
    return result


def find_postgres_bin(explicit: str | None) -> Path:
    if explicit:
        directory = Path(explicit).resolve()
    else:
        installations = Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "PostgreSQL"
        candidates = sorted(
            (path for path in installations.glob("*/bin") if path.parent.name.isdigit()),
            key=lambda path: int(path.parent.name),
            reverse=True,
        )
        if not candidates:
            raise LocalSetupError("PostgreSQL não encontrado. Informe --postgres-bin.")
        directory = candidates[0]
    for name in ("initdb.exe", "pg_ctl.exe"):
        if not (directory / name).is_file():
            raise LocalSetupError(f"Executável {name} não encontrado em {directory}.")
    return directory


def load_instance() -> dict:
    if not INSTANCE_FILE.exists():
        raise LocalSetupError("Execute primeiro: movement local setup")
    instance = json.loads(INSTANCE_FILE.read_text(encoding="utf-8"))
    if instance.get("project_root") != str(PROJECT_ROOT):
        raise LocalSetupError("Esta configuração pertence a outro caminho de projeto.")
    if not isinstance(instance.get("port"), int) or not 1024 <= instance["port"] <= 65535:
        raise LocalSetupError("Porta inválida na configuração local.")
    return instance


def is_running(instance: dict) -> bool:
    result = run_postgres(
        Path(instance["bin"]) / "pg_ctl.exe", "-D", str(DATA), "status", check=False
    )
    return result.returncode == 0


def start(instance: dict) -> None:
    if is_running(instance):
        return
    with socket.socket() as probe:
        probe.settimeout(1)
        if probe.connect_ex(("127.0.0.1", instance["port"])) == 0:
            raise LocalSetupError(f"A porta {instance['port']} está ocupada por outro processo.")
    run_postgres(
        Path(instance["bin"]) / "pg_ctl.exe",
        "-D",
        str(DATA),
        "-l",
        str(LOCAL / "postgres.log"),
        "-o",
        f"-p {instance['port']} -h 127.0.0.1 -c max_connections=30 -c shared_buffers=32MB",
        "-w",
        "start",
    )


def database_url(instance: dict, name: str) -> str:
    return URL.create(
        "postgresql+psycopg",
        username="movement",
        password=instance["app_password"],
        host="127.0.0.1",
        port=instance["port"],
        database=name,
    ).render_as_string(hide_password=False)


def provision_databases(instance: dict) -> None:
    with psycopg.connect(
        host="127.0.0.1",
        port=instance["port"],
        dbname="postgres",
        user="movement_admin",
        password=instance["admin_password"],
        autocommit=True,
        connect_timeout=5,
    ) as connection:
        role = connection.execute(
            "SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = %s",
            ("movement",),
        ).fetchone()
        if role is None:
            connection.execute(
                sql.SQL(
                    "CREATE ROLE {} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD {}"
                ).format(sql.Identifier("movement"), sql.Literal(instance["app_password"]))
            )
        elif any(role):
            raise LocalSetupError(
                "O usuário movement tem privilégios inesperados; revise o cadastro."
            )
        for name in ("movement", "movement_test"):
            owner = connection.execute(
                "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = %s", (name,)
            ).fetchone()
            if owner is None:
                connection.execute(
                    sql.SQL("CREATE DATABASE {} OWNER {}").format(
                        sql.Identifier(name), sql.Identifier("movement")
                    )
                )
            elif owner[0] != "movement":
                raise LocalSetupError(f"Banco {name} já existe com outro proprietário.")


def provision_application(instance: dict) -> None:
    settings_values = {
        "MOVEMENT_DATABASE_URL": database_url(instance, "movement"),
        "MOVEMENT_SESSION_SECRET": instance["session_secret"],
        "MOVEMENT_OPERATOR_USERNAME": "admin",
        "MOVEMENT_OPERATOR_PASSWORD_HASH": instance["operator_password_hash"],
        "MOVEMENT_CORS_ORIGINS": json.dumps(["http://localhost:5173", "http://127.0.0.1:5173"]),
        "MOVEMENT_SESSION_TTL_SECONDS": "3600",
        "MOVEMENT_STALE_AFTER_SECONDS": "90",
    }
    dotenv = BACKEND / ".env"
    if dotenv.exists():
        existing = Settings(_env_file=dotenv)
        if existing.database_url.get_secret_value() != settings_values["MOVEMENT_DATABASE_URL"]:
            raise LocalSetupError(
                "backend/.env já aponta para outra configuração; ele foi preservado."
            )
    else:
        dotenv.write_text(
            "# Configuração privada gerada por movement local setup.\n"
            + "\n".join(f"{key}={value}" for key, value in settings_values.items())
            + "\n",
            encoding="utf-8",
        )
    settings = Settings(_env_file=dotenv)
    # Alembic usa get_settings e os valores privados do arquivo, sem imprimi-los.
    previous_directory = Path.cwd()
    os.chdir(BACKEND)
    try:
        from app.settings import get_settings

        get_settings.cache_clear()
        command.upgrade(Config(str(BACKEND / "alembic.ini")), "head")
    finally:
        os.chdir(previous_directory)
    sessions = build_session_factory(settings)
    try:
        with sessions() as session:
            if session.get(Room, "sala-01") is None:
                session.add(Room(id="sala-01", name="Sala 01"))
                session.flush()
            device = session.get(Device, "esp32-01")
            if device is None:
                session.add(
                    Device(
                        id="esp32-01",
                        room_id="sala-01",
                        token_hash=hash_device_token(instance["device_token"]),
                    )
                )
            elif device.room_id != "sala-01" or device.token_hash != hash_device_token(
                instance["device_token"]
            ):
                raise LocalSetupError(
                    "Dispositivo já possui outra credencial; nenhuma foi substituída."
                )
            session.commit()
    finally:
        sessions.kw["bind"].dispose()
    frontend = PROJECT_ROOT / ".env"
    if not frontend.exists():
        frontend.write_text(
            "VITE_API_BASE_URL=http://127.0.0.1:8000\n"
            "VITE_ROOM_ID=sala-01\nVITE_USE_MOCK_DATA=false\n",
            encoding="utf-8",
        )
    (LOCAL / "access.txt").write_text(
        "MOVEMENT — ACESSO LOCAL PRIVADO\nNão versione nem compartilhe este arquivo.\n\n"
        "Dashboard: http://127.0.0.1:5173\nUsuário: admin\n"
        f"Senha: {instance['operator_password']}\n\n"
        "API: http://127.0.0.1:8000\nSwagger: http://127.0.0.1:8000/docs\n\n"
        f"PostgreSQL: 127.0.0.1:{instance['port']}\nBanco: movement\nUsuário: movement\n"
        f"Senha do banco: {instance['app_password']}\n\n"
        f"Dispositivo: esp32-01\nToken: {instance['device_token']}\n",
        encoding="utf-8",
    )
    (LOCAL / "test.env").write_text(
        f"MOVEMENT_TEST_DATABASE_URL={database_url(instance, 'movement_test')}\n", encoding="utf-8"
    )


def setup(port: int, postgres_bin: str | None) -> dict:
    LOCAL.mkdir(parents=True, exist_ok=True)
    if INSTANCE_FILE.exists():
        instance = load_instance()
        if instance["port"] != port:
            raise LocalSetupError(
                "Instância existente utiliza outra porta; configuração preservada."
            )
    else:
        if (BACKEND / ".env").exists():
            raise LocalSetupError(
                "backend/.env já existe; revise-o antes de criar outra instância."
            )
        if DATA.exists():
            raise LocalSetupError(
                "Diretório de dados já existe sem configuração; ele foi preservado."
            )
        password = secrets.token_urlsafe(24)
        instance = {
            "project_root": str(PROJECT_ROOT),
            "bin": str(find_postgres_bin(postgres_bin)),
            "port": port,
            "admin_password": secrets.token_urlsafe(32),
            "app_password": secrets.token_urlsafe(32),
            "operator_password": password,
            "operator_password_hash": hash_password(password),
            "session_secret": secrets.token_urlsafe(48),
            "device_token": secrets.token_urlsafe(32),
        }
        INSTANCE_FILE.write_text(json.dumps(instance, indent=2), encoding="utf-8")
    if not (DATA / "PG_VERSION").exists():
        password_file = LOCAL / "init-password.txt"
        password_file.write_text(instance["admin_password"] + "\n", encoding="utf-8")
        try:
            run_postgres(
                Path(instance["bin"]) / "initdb.exe",
                "-D",
                str(DATA),
                "-U",
                "movement_admin",
                "--pwfile",
                str(password_file),
                "--auth-host=scram-sha-256",
                "--auth-local=scram-sha-256",
                "--encoding=UTF8",
                "--locale=C",
            )
        finally:
            password_file.unlink(missing_ok=True)
    start(instance)
    provision_databases(instance)
    provision_application(instance)
    return instance


def run_local(action: str, port: int = 5433, postgres_bin: str | None = None) -> None:
    if action == "setup":
        instance = setup(port, postgres_bin)
        print(f"Backend configurado com PostgreSQL próprio em 127.0.0.1:{instance['port']}.")
        print(f"Acessos privados: {LOCAL / 'access.txt'}")
    else:
        instance = load_instance()
        if action == "start":
            start(instance)
            print(f"PostgreSQL do projeto disponível em 127.0.0.1:{instance['port']}.")
        elif action == "stop":
            if is_running(instance):
                run_postgres(
                    Path(instance["bin"]) / "pg_ctl.exe",
                    "-D",
                    str(DATA),
                    "-m",
                    "fast",
                    "-w",
                    "stop",
                )
            print("PostgreSQL do projeto encerrado. Os dados foram preservados.")
        else:
            print("PostgreSQL do projeto: " + ("iniciado" if is_running(instance) else "parado"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["setup", "start", "stop", "status"])
    parser.add_argument("--port", type=int, default=5433)
    parser.add_argument("--postgres-bin")
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("Porta deve estar entre 1024 e 65535")
    try:
        run_local(args.action, args.port, args.postgres_bin)
    except (LocalSetupError, psycopg.Error) as error:
        # Não imprimir mensagens SQL: elas podem conter a senha de provisionamento.
        detail = (
            str(error)
            if isinstance(error, LocalSetupError)
            else "Falha de conexão/provisionamento."
        )
        parser.exit(1, detail + "\n")


if __name__ == "__main__":
    main()
