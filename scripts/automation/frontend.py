from __future__ import annotations

import os
import subprocess
from pathlib import Path

from .common import detect_node, npm_executable, run, spawn


def frontend_install(frontend_dir: Path) -> None:
    print("[frontend] Checking npm dependencies...")

    node_modules = frontend_dir / "node_modules"
    package_lock = frontend_dir / "package-lock.json"

    if node_modules.exists() and package_lock.exists():
        print("[frontend] ✓ Node.js dependencies are installed")
        return

    print("[frontend] Installing npm dependencies...")
    code = run([npm_executable(), "install", "--silent"], cwd=frontend_dir)
    if code != 0:
        print("[frontend] ✗ Failed to install npm dependencies")
        raise SystemExit(code)

    print("[frontend] ✓ npm dependencies installed successfully")


def frontend_start(frontend_dir: Path, port: int) -> subprocess.Popen | None:
    if not detect_node():
        print("[warn] Node.js/npm not detected; skipping frontend")
        return None

    env = os.environ.copy()
    env.setdefault("PORT", str(port))
    print(f"[frontend] Starting React dev server at http://localhost:{port}")
    return spawn([npm_executable(), "start"], cwd=frontend_dir, env=env)


def frontend_build(frontend_dir: Path) -> None:
    print("[frontend] Building production bundle...")
    code = run([npm_executable(), "run", "build"], cwd=frontend_dir, quiet=True)
    if code != 0:
        print("[frontend] ✗ Production build failed")
        raise SystemExit(code)

    print("[frontend] ✓ Production build completed successfully")
