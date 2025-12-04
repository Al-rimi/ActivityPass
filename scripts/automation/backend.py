from __future__ import annotations

import getpass
import os
import secrets
import subprocess
from pathlib import Path

from .common import run, run_with_output, spawn


def ensure_env_file(repo_root: Path) -> None:
    """Copy .env.example to .env and populate database credentials if missing."""
    env_file = repo_root / ".env"
    env_example = repo_root / ".env.example"

    if env_file.exists():
        print("[config] .env file found")
        return

    if not env_example.exists():
        print("[warn] .env.example not found; skipping .env creation")
        return

    print("[config] .env file not found. Let's set up your database configuration.")

    db_user = input("Enter MySQL username (default: root): ").strip() or "root"
    db_password = getpass.getpass("Enter MySQL password: ").strip()

    if not db_password:
        print("[error] MySQL password is required")
        raise SystemExit(1)

    example_content = env_example.read_text()
    env_content = example_content.replace("DB_USER=root", f"DB_USER={db_user}")
    env_content = env_content.replace("DB_PASSWORD=your-password-here", f"DB_PASSWORD={db_password}")

    secret_key = secrets.token_urlsafe(50)
    env_content = env_content.replace(
        "DJANGO_SECRET_KEY=change-me-example", f"DJANGO_SECRET_KEY={secret_key}"
    )

    env_file.write_text(env_content)
    print(f"[config] .env file created successfully at {env_file}")


def venv_python(venv_dir: Path) -> Path:
    return venv_dir / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def ensure_venv(python_exec: str, backend_dir: Path, venv_dir: Path) -> Path:
    if not venv_dir.exists():
        print("[backend] Creating virtual environment")
        code = run([python_exec, "-m", "venv", str(venv_dir)])
        if code != 0:
            raise SystemExit(code)

    py_path = venv_python(venv_dir)
    if not py_path.exists():
        print("[error] venv python not found")
        raise SystemExit(1)

    return py_path


def install_backend_deps(py: Path, backend_dir: Path) -> None:
    req = backend_dir / "requirements.txt"
    if not req.exists():
        print("[backend] requirements.txt not found; skipping install")
        return

    with req.open() as handle:
        packages = [line.strip() for line in handle if line.strip() and not line.startswith("#")]

    print(f"[backend] Checking Python dependencies ({len(packages)} packages)...")
    code, stdout, _ = run_with_output([str(py), "-m", "pip", "list", "--format=json"])
    installed_packages: set[str] = set()
    if code == 0:
        try:
            import json

            for pkg in json.loads(stdout):
                installed_packages.add(pkg["name"].lower())
        except (json.JSONDecodeError, KeyError):
            pass

    missing: list[str] = []
    for package_line in packages:
        package_spec = package_line.split(";")[0].strip()
        for delimiter in ("==", ">=", "<=", ">", "<"):
            if delimiter in package_spec:
                package_spec = package_spec.split(delimiter, 1)[0]
        base_name = package_spec.strip().lower()
        normalized = base_name.replace("-", "_")
        if base_name not in installed_packages and normalized not in installed_packages:
            missing.append(package_line)

    if not missing:
        print("[backend] ✓ Python dependencies are already installed")
        return

    print(f"[backend] Installing {len(missing)} missing Python dependencies...")
    run([str(py), "-m", "pip", "install", "--upgrade", "pip"], quiet=True)
    code = run([str(py), "-m", "pip", "install", "-r", str(req)], quiet=True)
    if code != 0:
        print("[backend] ✗ Failed to install Python dependencies")
        raise SystemExit(code)

    print("[backend] ✓ Python dependencies installed successfully")


def migrate(py: Path, backend_dir: Path) -> None:
    print("[backend] Applying database migrations...")
    code = run([str(py), "manage.py", "migrate"], cwd=backend_dir)
    if code != 0:
        print("[backend] ✗ Database migration failed")
        raise SystemExit(code)

    print("[backend] Database migrations applied")


def init_app(py: Path, backend_dir: Path) -> None:
    print("[backend] Initializing application (migrations + seeding)...")
    code = run([str(py), "manage.py", "init_app"], cwd=backend_dir)
    if code == 0:
        print("[backend] Application initialized successfully")
        return

    print("[backend] init_app failed; falling back to migrate only")
    migrate(py, backend_dir)


def seed_students(py: Path, backend_dir: Path) -> None:
    print("[backend] Seeding students...")
    code = run([str(py), "manage.py", "seed_students"], cwd=backend_dir)
    if code == 0:
        print("[backend] Students seeded successfully")
    else:
        print("[backend] ⚠ seed_students command failed or not implemented; continuing")


def start_backend(py: Path, backend_dir: Path, host: str, port: int) -> subprocess.Popen:
    print(f"[backend] Starting Django server at http://{host}:{port}")
    return spawn([str(py), "manage.py", "runserver", f"{host}:{port}"], cwd=backend_dir)
