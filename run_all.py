"""Cross-platform automation script for ActivityPass.

Sets up backend virtual environment, installs dependencies, runs migrations,
optionally seeds students, then starts Django dev server. Afterwards installs
frontend npm packages and optionally starts React dev server or builds production.

Usage:
    python run_all.py                # full setup + start backend + frontend dev
    python run_all.py --skip-seed    # skip student seeding
    python run_all.py --no-frontend  # only backend
    python run_all.py --build        # build frontend instead of starting dev server
    python run_all.py --host 0.0.0.0 --port 8000 --frontend-port 3000

Flags:
    --python PATH        Override Python executable to create venv.
    --backend-dir PATH   Custom backend directory (default: ./backend)
    --frontend-dir PATH  Custom frontend directory (default: ./frontend)
    --skip-seed          Skip seeding students.
    --no-frontend        Do not run any frontend steps.
    --build              Run production build (`npm run build`) instead of dev server.
    --host HOST          Backend host (default 127.0.0.1).
    --port PORT          Backend port (default 8000).
    --frontend-port PORT Port for frontend dev server (default 3000).

Requires: Python 3.11+, Node.js & npm (for frontend), MySQL (if using MySQL engine).
"""

from __future__ import annotations

import argparse
import os
import shutil
import stat
import subprocess
import sys
import time
from pathlib import Path


def run(cmd: list[str] | str, cwd: Path | None = None, env: dict[str, str] | None = None) -> int:
    print(f"[run] {cmd}")
    proc = subprocess.Popen(cmd, cwd=str(cwd) if cwd else None, env=env)
    return proc.wait()


def spawn(cmd: list[str] | str, cwd: Path | None = None, env: dict[str, str] | None = None) -> subprocess.Popen:
    print(f"[spawn] {cmd}")
    return subprocess.Popen(cmd, cwd=str(cwd) if cwd else None, env=env)


def npm_executable() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def detect_node() -> bool:
    return shutil.which("node") is not None and shutil.which(npm_executable()) is not None


def venv_python(venv_dir: Path) -> Path:
    if os.name == "nt":
        return venv_dir / "Scripts" / "python.exe"
    return venv_dir / "bin" / "python"


def ensure_venv(python_exec: str, backend_dir: Path, venv_dir: Path) -> Path:
    if not venv_dir.exists():
        print("[backend] Creating virtual environment")
        code = run([python_exec, "-m", "venv", str(venv_dir)])
        if code != 0:
            sys.exit(code)
    py = venv_python(venv_dir)
    if not py.exists():
        print("[error] venv python not found")
        sys.exit(1)
    return py


def install_backend_deps(py: Path, backend_dir: Path):
    req = backend_dir / "requirements.txt"
    if req.exists():
        print("[backend] Installing dependencies")
        code = run([str(py), "-m", "pip", "install", "--upgrade", "pip"]) or run([str(py), "-m", "pip", "install", "-r", str(req)])
        if code != 0:
            sys.exit(code)
    else:
        print("[backend] requirements.txt not found; skipping install")


def migrate(py: Path, backend_dir: Path):
    print("[backend] Applying migrations")
    code = run([str(py), "manage.py", "migrate"], cwd=backend_dir)
    if code != 0:
        sys.exit(code)


def init_app(py: Path, backend_dir: Path):
    print("[backend] Initializing app (migrate + seed + ensure admin)")
    code = run([str(py), "manage.py", "init_app"], cwd=backend_dir)
    if code != 0:
        print("[backend] init_app failed; falling back to migrate only")
        migrate(py, backend_dir)


def seed_students(py: Path, backend_dir: Path):
    print("[backend] Seeding students (if command exists)")
    code = run([str(py), "manage.py", "seed_students"], cwd=backend_dir)
    if code != 0:
        print("[warn] seed_students command failed or not implemented; continuing")


def start_backend(py: Path, backend_dir: Path, host: str, port: int) -> subprocess.Popen:
    print(f"[backend] Starting Django server at http://{host}:{port}")
    return spawn([str(py), "manage.py", "runserver", f"{host}:{port}"], cwd=backend_dir)


def frontend_install(frontend_dir: Path):
    print("[frontend] Installing npm dependencies")
    code = run([npm_executable(), "install"], cwd=frontend_dir)
    if code != 0:
        sys.exit(code)


def frontend_start(frontend_dir: Path, port: int) -> subprocess.Popen:
    env = os.environ.copy()
    # CRA respects PORT env var
    env.setdefault("PORT", str(port))
    print(f"[frontend] Starting React dev server at http://localhost:{port}")
    return spawn([npm_executable(), "start"], cwd=frontend_dir, env=env)


def frontend_build(frontend_dir: Path):
    print("[frontend] Building production bundle")
    code = run([npm_executable(), "run", "build"], cwd=frontend_dir)
    if code != 0:
        sys.exit(code)


def remove_path(path: Path):
    if not path.exists():
        return

    print(f"[clean] Removing {path}")

    def _onerror(func, p, exc_info):
        try:
            os.chmod(p, stat.S_IWRITE)
        except OSError:
            pass
        func(p)

    if path.is_dir():
        for attempt in range(3):
            try:
                shutil.rmtree(path, onerror=_onerror)
                break
            except OSError as err:
                if attempt == 2:
                    raise
                print(f"[clean] Retry removing {path}: {err}")
                time.sleep(0.5)
    else:
        try:
            path.unlink()
        except FileNotFoundError:
            return
        except PermissionError:
            os.chmod(path, stat.S_IWRITE)
            path.unlink()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="ActivityPass full-stack setup helper")
    p.add_argument("--python", default=sys.executable, help="Python executable to create venv")
    p.add_argument("--backend-dir", default="backend", help="Backend directory path")
    p.add_argument("--frontend-dir", default="frontend", help="Frontend directory path")
    p.add_argument("--skip-seed", action="store_true", help="Skip student seeding")
    p.add_argument("--no-frontend", action="store_true", help="Skip all frontend steps")
    p.add_argument("--build", action="store_true", help="Build frontend instead of running dev server")
    p.add_argument("--host", default="127.0.0.1", help="Backend host")
    p.add_argument("--port", type=int, default=8000, help="Backend port")
    p.add_argument("--frontend-port", type=int, default=3000, help="Frontend dev server port")
    p.add_argument("--rebuild", action="store_true", help="Remove existing environments/artifacts and rebuild backend & frontend")
    return p.parse_args()


def main():
    args = parse_args()
    repo_root = Path.cwd()
    backend_dir = (repo_root / args.backend_dir).resolve()
    frontend_dir = (repo_root / args.frontend_dir).resolve()
    venv_dir = backend_dir / ".venv"

    if args.rebuild:
        print("[rebuild] Refreshing build artifacts (dependencies stay cached)")
        frontend_build_dir = frontend_dir / "build"
        remove_path(frontend_build_dir)
        args.build = True

    if not backend_dir.exists():
        print(f"[error] Backend directory '{backend_dir}' not found")
        sys.exit(1)

    py = ensure_venv(args.python, backend_dir, venv_dir)
    install_backend_deps(py, backend_dir)
    # Prefer init_app which also ensures default admin user
    if args.skip_seed:
        migrate(py, backend_dir)
    else:
        init_app(py, backend_dir)

    backend_proc = start_backend(py, backend_dir, args.host, args.port)

    frontend_proc: subprocess.Popen | None = None
    if not args.no_frontend:
        if not frontend_dir.exists():
            print(f"[warn] Frontend directory '{frontend_dir}' not found; skipping frontend")
        elif not detect_node():
            print("[warn] Node.js/npm not detected; skipping frontend")
        else:
            try:
                frontend_install(frontend_dir)
            except FileNotFoundError:
                print("[error] npm command not found. Install Node.js (https://nodejs.org) and ensure npm is on your PATH.")
            else:
                if args.build:
                    frontend_build(frontend_dir)
                else:
                    frontend_proc = frontend_start(frontend_dir, args.frontend_port)

    print("\n[done] Automation started. Press Ctrl+C to terminate.")
    print("Backend PID:", backend_proc.pid)
    if frontend_proc:
        print("Frontend PID:", frontend_proc.pid)

    try:
        while True:
            # Keep parent alive; check if child died
            if backend_proc.poll() is not None:
                print("[backend] Server exited; shutting down.")
                if frontend_proc and frontend_proc.poll() is None:
                    frontend_proc.terminate()
                break
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n[signal] Received interrupt; terminating child processes...")
        for proc in [frontend_proc, backend_proc]:
            if proc and proc.poll() is None:
                proc.terminate()
        time.sleep(1)


if __name__ == "__main__":
    main()
