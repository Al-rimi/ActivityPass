#!/bin/bash
set -euo pipefail

# Keep runtime deterministic even if 1Panel starts us from another directory
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

section() {
    printf '\n=== %s ===\n' "$1"
}

info() {
    printf '[INFO] %s\n' "$1"
}

warn() {
    printf '[WARN] %s\n' "$1"
}

section "Startup"
info "Working directory: $SCRIPT_DIR"
info "Running as: $(whoami)"

if [ ! -f .env ]; then
    warn ".env not found; ensure it is mounted alongside the backend"
fi

VENV_PATH="${SCRIPT_DIR}/.venv"
PY_BIN="$VENV_PATH/bin/python"
SYSTEM_PYTHON="$(command -v python3 || command -v python || true)"

if [ -z "$SYSTEM_PYTHON" ]; then
    warn "No system python interpreter found; cannot create virtualenv"
    exit 1
fi

refresh_venv() {
    local reason="$1"
    warn "$reason"
    rm -rf "$VENV_PATH"
    "$SYSTEM_PYTHON" -m venv "$VENV_PATH"
}

section "Virtualenv"
if [ ! -f "$VENV_PATH/bin/activate" ]; then
    refresh_venv "Virtualenv missing; creating fresh environment"
fi

# shellcheck disable=SC1090
source "$VENV_PATH/bin/activate"

if [ ! -x "$PY_BIN" ] || ! "$PY_BIN" -c "import sys" >/dev/null 2>&1; then
    deactivate 2>/dev/null || true
    refresh_venv "Virtualenv python invalid; recreating"
    # shellcheck disable=SC1090
    source "$VENV_PATH/bin/activate"
fi

PY_BIN="$VENV_PATH/bin/python"
info "Python: $($PY_BIN -V 2>&1)"

section "Dependencies"
if ! "$PY_BIN" -m pip -V >/dev/null 2>&1; then
    warn "pip missing; bootstrapping with ensurepip"
    "$PY_BIN" -m ensurepip --upgrade
fi

if "$PY_BIN" -m pip show mysqlclient >/dev/null 2>&1; then
    warn "Removing incompatible mysqlclient package"
    "$PY_BIN" -m pip uninstall -y mysqlclient || warn "Unable to remove mysqlclient"
fi

install_marker="$VENV_PATH/.deps_installed"
if [ -f "$install_marker" ] && "$PY_BIN" -c "import django" >/dev/null 2>&1; then
    info "Dependencies already satisfied"
else
    info "Installing Python requirements"
    "$PY_BIN" -m pip install --no-cache-dir -r requirements.txt
    touch "$install_marker"
fi

section "Migrations"
"$PY_BIN" manage.py migrate --noinput
info "Database migrations complete"

section "Server"
info "Starting Django development server on 0.0.0.0:8000"
exec "$PY_BIN" manage.py runserver 0.0.0.0:8000
