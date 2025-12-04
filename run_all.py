"""Cross-platform automation helper for ActivityPass local development."""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

from scripts.automation import backend as backend_ops
from scripts.automation import frontend as frontend_ops
from scripts.automation.common import detect_node, remove_path


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
    backend_ops.ensure_env_file(repo_root)

    if args.rebuild:
        print("[rebuild] Refreshing build artifacts (dependencies stay cached)")
        frontend_build_dir = frontend_dir / "build"
        remove_path(frontend_build_dir)
        args.build = True

    if not backend_dir.exists():
        print(f"[error] Backend directory '{backend_dir}' not found")
        sys.exit(1)

    py = backend_ops.ensure_venv(args.python, backend_dir, venv_dir)
    backend_ops.install_backend_deps(py, backend_dir)
    # Prefer init_app which also ensures default admin user
    if not args.skip_seed:
        backend_ops.init_app(py, backend_dir)

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
                frontend_ops.frontend_install(frontend_dir)
                frontend_ops.frontend_build(frontend_dir)
            except FileNotFoundError:
                print("[error] npm command not found. Install Node.js (https://nodejs.org) and ensure npm is on your PATH.")

    backend_proc = backend_ops.start_backend(py, backend_dir, args.host, args.port)

    frontend_proc: subprocess.Popen | None = None
    if not args.no_frontend and not args.build:
        if not frontend_dir.exists():
            print(f"[warn] Frontend directory '{frontend_dir}' not found; skipping frontend")
        elif not detect_node():
            print("[warn] Node.js/npm not detected; skipping frontend")
        else:
            try:
                frontend_ops.frontend_install(frontend_dir)
            except FileNotFoundError:
                print("[error] npm command not found. Install Node.js (https://nodejs.org) and ensure npm is on your PATH.")
            else:
                frontend_proc = frontend_ops.frontend_start(frontend_dir, args.frontend_port)

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
