"""Cross-platform automation script for ActivityPass.

Sets up backend virtual environment, installs dependencies, runs migrations,
optionally seeds students and courses, then starts Django dev server. Afterwards installs
frontend npm packages and optionally starts React dev server or builds production.

Usage:
    python run_all.py                # full setup + start backend + frontend dev
    python run_all.py --skip-seed    # skip student and course seeding
    python run_all.py --seed-only    # only seeding, no servers
    python run_all.py --no-frontend  # only backend
    python run_all.py --build        # build frontend instead of starting dev server
    python run_all.py --host 0.0.0.0 --port 8000 --frontend-port 3000

Flags:
    --python PATH        Override Python executable to create venv.
    --backend-dir PATH   Custom backend directory (default: ./backend)
    --frontend-dir PATH  Custom frontend directory (default: ./frontend)
    --skip-seed          Skip seeding students and courses.
    --no-frontend        Do not run any frontend steps.
    --build              Run production build (`npm run build`) instead of dev server.
    --host HOST          Backend host (default 127.0.0.1).
    --port PORT          Backend port (default 8000).
    --frontend-port PORT Port for frontend dev server (default 3000).

Requires: Python 3.11+, Node.js & npm (for frontend), MySQL (if using MySQL engine).
"""

from __future__ import annotations

import argparse
import getpass
import os
import shutil
import stat
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict


def run(cmd: list[str] | str, cwd: Path | None = None, env: dict[str, str] | None = None, quiet: bool = False) -> int:
    if not quiet:
        print(f"[run] {cmd}")
    proc = subprocess.Popen(cmd, cwd=str(cwd) if cwd else None, env=env, 
                          stdout=subprocess.DEVNULL if quiet else None,
                          stderr=subprocess.DEVNULL if quiet else None)
    return proc.wait()


def run_with_output(cmd: list[str] | str, cwd: Path | None = None, env: dict[str, str] | None = None) -> tuple[int, str, str]:
    """Run command and capture output for analysis."""
    proc = subprocess.Popen(cmd, cwd=str(cwd) if cwd else None, env=env,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = proc.communicate()
    return proc.returncode, stdout, stderr


def spawn(cmd: list[str] | str, cwd: Path | None = None, env: dict[str, str] | None = None) -> subprocess.Popen:
    print(f"[spawn] {cmd}")
    return subprocess.Popen(cmd, cwd=str(cwd) if cwd else None, env=env)


def npm_executable() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def detect_node() -> bool:
    return shutil.which("node") is not None and shutil.which(npm_executable()) is not None


def ensure_env_file(repo_root: Path):
    """Check for .env file and create it if missing by prompting for MySQL credentials."""
    env_file = repo_root / ".env"
    env_example = repo_root / ".env.example"
    
    if env_file.exists():
        print("[config] .env file found")
        return
    
    if not env_example.exists():
        print("[warn] .env.example not found; skipping .env creation")
        return
    
    print("[config] .env file not found. Let's set up your database configuration.")
    
    # Prompt for MySQL credentials
    db_user = input("Enter MySQL username (default: root): ").strip() or "root"
    db_password = getpass.getpass("Enter MySQL password: ").strip()
    
    if not db_password:
        print("[error] MySQL password is required")
        sys.exit(1)
    
    # Read .env.example and create .env with user credentials
    with open(env_example, 'r') as f:
        example_content = f.read()
    
    # Replace the example values with user input
    env_content = example_content.replace("DB_USER=root", f"DB_USER={db_user}")
    env_content = env_content.replace("DB_PASSWORD=your-password-here", f"DB_PASSWORD={db_password}")
    
    # Generate a random secret key
    import secrets
    secret_key = secrets.token_urlsafe(50)
    env_content = env_content.replace("DJANGO_SECRET_KEY=change-me-example", f"DJANGO_SECRET_KEY={secret_key}")
    
    if "VITE_BASE_PATH" not in env_content:
        env_content += "\nVITE_BASE_PATH=/"
    if "VITE_API_BASE_PATH" not in env_content:
        env_content += "\nVITE_API_BASE_PATH=/api/"

    with open(env_file, 'w') as f:
        f.write(env_content)
    
    print(f"[config] .env file created successfully at {env_file}")


def load_env_settings(env_path: Path) -> Dict[str, str]:
    values: Dict[str, str] = {}
    if not env_path.exists():
        return values

    with open(env_path, 'r', encoding='utf-8') as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip()
    return values


def normalize_base_path(path_value: str | None) -> str:
    if not path_value:
        return '/'
    value = path_value.strip()
    if value == '':
        return '/'
    if not value.startswith('/'):
        value = '/' + value
    if not value.endswith('/'):
        value = value + '/'
    return value


def derive_api_base(base_path: str, explicit: str | None = None) -> str:
    if explicit:
        return normalize_base_path(explicit)
    if base_path == '/':
        return '/api/'
    return f"{base_path}api/"


def upsert_env_values(env_path: Path, updates: Dict[str, str]):
    if not updates or not env_path.exists():
        return

    with open(env_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    replaced: set[str] = set()
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if '=' in stripped and not stripped.startswith('#'):
            key, _, _ = stripped.partition('=')
            key = key.strip()
            if key in updates:
                new_lines.append(f"{key}={updates[key]}\n")
                replaced.add(key)
                continue
        new_lines.append(line)

    for key, value in updates.items():
        if key not in replaced:
            new_lines.append(f"{key}={value}\n")

    with open(env_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)


def ensure_env_defaults(env_path: Path) -> Dict[str, str]:
    values = load_env_settings(env_path)
    base_norm = normalize_base_path(values.get('VITE_BASE_PATH'))
    api_norm = derive_api_base(base_norm, values.get('VITE_API_BASE_PATH'))
    updates: Dict[str, str] = {}

    if values.get('VITE_BASE_PATH') != base_norm:
        updates['VITE_BASE_PATH'] = base_norm
    if values.get('VITE_API_BASE_PATH') != api_norm:
        updates['VITE_API_BASE_PATH'] = api_norm

    upsert_env_values(env_path, updates)
    if updates:
        values = load_env_settings(env_path)
    return values


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
        # Count packages in requirements.txt
        with open(req, 'r') as f:
            packages = [line.strip() for line in f if line.strip() and not line.strip().startswith('#')]
        package_count = len(packages)
        print(f"[backend] Checking Python dependencies ({package_count} packages)...")
        
        # Check if required packages are installed by trying to import them or checking pip list
        installed_packages = []
        code, stdout, _ = run_with_output([str(py), "-m", "pip", "list", "--format=json"])
        if code == 0:
            try:
                import json
                installed = json.loads(stdout)
                installed_packages = [pkg['name'].lower() for pkg in installed]
            except (json.JSONDecodeError, KeyError):
                pass
        
        # Check if all required packages are installed
        missing_packages = []
        for package_line in packages:
            # Extract package name (handle version specifiers like django==4.2.0)
            # Also handle conditional dependencies like "package>=1.0 ; condition"
            package_spec = package_line.split(';')[0].strip()  # Remove condition if present
            package_name = package_spec.split('==')[0].split('>=')[0].split('>')[0].split('<')[0].split('<=')[0].strip().lower()
            # Convert hyphens to underscores to match pip's normalization
            package_name_normalized = package_name.replace('-', '_')
            if package_name not in installed_packages and package_name_normalized not in installed_packages:
                missing_packages.append(package_line)
        
        if not missing_packages:
            print("[backend] ✓ Python dependencies are already installed")
            return
        
        print(f"[backend] Installing {len(missing_packages)} missing Python dependencies...")
        
        # Upgrade pip first
        code = run([str(py), "-m", "pip", "install", "--upgrade", "pip"], quiet=True)
        if code != 0:
            print("[backend] ⚠ Failed to upgrade pip, continuing with installation...")
        
        # Install requirements
        code = run([str(py), "-m", "pip", "install", "-r", str(req)], quiet=True)
        if code == 0:
            print("[backend] ✓ Python dependencies installed successfully")
        else:
            print("[backend] ✗ Failed to install Python dependencies")
            sys.exit(code)
    else:
        print("[backend] requirements.txt not found; skipping install")


def migrate(py: Path, backend_dir: Path):
    print("[backend] Applying database migrations...")
    code = run([str(py), "manage.py", "migrate"], cwd=backend_dir)
    if code == 0:
        print("[backend] Database migrations applied")
    else:
        print("[backend] ✗ Database migration failed")
        sys.exit(code)


def init_app(py: Path, backend_dir: Path):
    print("[backend] Initializing application (migrations + seeding)...")
    code = run([str(py), "manage.py", "init_app"], cwd=backend_dir)
    if code == 0:
        print("[backend] Application initialized successfully")
    else:
        print("[backend] init_app failed; falling back to migrate only")
        migrate(py, backend_dir)


def seed_students(py: Path, backend_dir: Path):
    print("[backend] Seeding students...")
    code = run([str(py), "manage.py", "seed_students"], cwd=backend_dir)
    if code == 0:
        print("[backend] Students seeded successfully")
    else:
        print("[backend] ⚠ seed_students command failed or not implemented; continuing")


def start_backend(py: Path, backend_dir: Path, host: str, port: int) -> subprocess.Popen:
    print(f"[backend] Starting Django server at http://{host}:{port}")
    return spawn([str(py), "manage.py", "runserver", f"{host}:{port}"], cwd=backend_dir)


def frontend_install(frontend_dir: Path):
    print("[frontend] Checking npm dependencies...")
    
    # Check if node_modules exists and package-lock.json is recent
    node_modules = frontend_dir / "node_modules"
    package_lock = frontend_dir / "package-lock.json"
    
    if node_modules.exists() and package_lock.exists():
        print("[frontend] ✓ Node.js dependencies are installed")
        return
        
    print("[frontend] Installing npm dependencies...")
    code = run([npm_executable(), "install", "--silent"], cwd=frontend_dir)
    if code == 0:
        print("[frontend] ✓ npm dependencies installed successfully")
    else:
        print("[frontend] ✗ Failed to install npm dependencies")
        sys.exit(code)


def frontend_start(frontend_dir: Path, port: int, vite_base: str, vite_api_base: str) -> subprocess.Popen:
    env = os.environ.copy()
    # CRA respects PORT env var
    env.setdefault("PORT", str(port))
    env.setdefault("VITE_BASE_PATH", vite_base)
    env.setdefault("VITE_API_BASE_PATH", vite_api_base)
    print(f"[frontend] Starting React dev server at http://localhost:{port}")
    return spawn([npm_executable(), "start"], cwd=frontend_dir, env=env)


def frontend_build(frontend_dir: Path, vite_base: str, vite_api_base: str):
    print("[frontend] Building production bundle...")
    env = os.environ.copy()
    env.setdefault("VITE_BASE_PATH", vite_base)
    env.setdefault("VITE_API_BASE_PATH", vite_api_base)
    code = run([npm_executable(), "run", "build"], cwd=frontend_dir, quiet=True, env=env)
    if code == 0:
        print("[frontend] ✓ Production build completed successfully")
    else:
        print("[frontend] ✗ Production build failed")
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
    p.add_argument("--skip-seed", action="store_true", help="Skip student and course seeding")
    p.add_argument("--seed-only", action="store_true", help="Only run seeding, skip starting servers")
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

    # Check and create .env file if needed
    ensure_env_file(repo_root)
    env_settings = ensure_env_defaults(repo_root / ".env")
    vite_base_path = normalize_base_path(env_settings.get("VITE_BASE_PATH"))
    vite_api_base_path = derive_api_base(vite_base_path, env_settings.get("VITE_API_BASE_PATH"))

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
    if not args.skip_seed:
        init_app(py, backend_dir)

    if args.seed_only:
        print("[done] Seeding completed. Exiting.")
        return

    # Build frontend before starting backend if --build is specified
    if not args.no_frontend and args.build:
        if not frontend_dir.exists():
            print(f"[warn] Frontend directory '{frontend_dir}' not found; skipping frontend")
        elif not detect_node():
            print("[warn] Node.js/npm not detected; skipping frontend")
        else:
            try:
                frontend_install(frontend_dir)
                frontend_build(frontend_dir, vite_base_path, vite_api_base_path)
            except FileNotFoundError:
                print("[error] npm command not found. Install Node.js (https://nodejs.org) and ensure npm is on your PATH.")

    backend_proc = start_backend(py, backend_dir, args.host, args.port)

    frontend_proc: subprocess.Popen | None = None
    if not args.no_frontend and not args.build:
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
                frontend_proc = frontend_start(frontend_dir, args.frontend_port, vite_base_path, vite_api_base_path)

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
