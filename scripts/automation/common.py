from __future__ import annotations

import os
import shutil
import stat
import subprocess
import time
from pathlib import Path
from typing import Iterable


def run(
    cmd: Iterable[str] | str,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    quiet: bool = False,
) -> int:
    """Execute a blocking command and return its exit code."""
    if not quiet:
        print(f"[run] {cmd}")
    proc = subprocess.Popen(
        cmd,
        cwd=str(cwd) if cwd else None,
        env=env,
        stdout=subprocess.DEVNULL if quiet else None,
        stderr=subprocess.DEVNULL if quiet else None,
    )
    return proc.wait()


def run_with_output(
    cmd: Iterable[str] | str,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
) -> tuple[int, str, str]:
    """Execute a command and capture stdout/stderr."""
    proc = subprocess.Popen(
        cmd,
        cwd=str(cwd) if cwd else None,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    stdout, stderr = proc.communicate()
    return proc.returncode, stdout, stderr


def spawn(
    cmd: Iterable[str] | str,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
) -> subprocess.Popen:
    """Launch a long-running process and return its Popen handle."""
    print(f"[spawn] {cmd}")
    return subprocess.Popen(cmd, cwd=str(cwd) if cwd else None, env=env)


def npm_executable() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def detect_node() -> bool:
    return shutil.which("node") is not None and shutil.which(npm_executable()) is not None


def remove_path(path: Path) -> None:
    if not path.exists():
        return

    print(f"[clean] Removing {path}")

    def _onerror(func, target, exc_info):
        try:
            os.chmod(target, stat.S_IWRITE)
        except OSError:
            pass
        func(target)

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
