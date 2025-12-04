#!/bin/bash
set -euo pipefail

# Keep runtime deterministic even if 1Panel starts us from another directory
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

log() {
    printf '%s %s
' "[DEBUG]" "$1"
}

warn() {
    printf '%s %s
' "[WARN]" "$1"
}

log "Runtime diagnostics begin"
log "PWD=$(pwd)"
log "Whoami=$(whoami)"
log "Listing current directory"
ls -al

if [ -d ".venv" ]; then
    log "Listing .venv/bin contents"
    ls -al .venv/bin 2>/dev/null || warn "Unable to list .venv/bin"
else
    warn ".venv directory missing before activation"
fi

if [ -f .env ]; then
    log "Found .env file"
else
    warn ".env not found in $(pwd)"
fi

VENV_PATH="${SCRIPT_DIR}/.venv"
PY_BIN="$VENV_PATH/bin/python"
PIP_BIN="$VENV_PATH/bin/pip"

if [ ! -f "$VENV_PATH/bin/activate" ]; then
    warn "Virtualenv activate script missing; creating fresh venv"
    python -m venv "$VENV_PATH"
fi

log "Activating virtualenv at $VENV_PATH"
# shellcheck disable=SC1090
source "$VENV_PATH/bin/activate"

log "VIRTUAL_ENV=$VIRTUAL_ENV"
log "PATH=$PATH"

if [ ! -x "$PY_BIN" ]; then
    warn "Virtualenv python missing; recreating venv"
    deactivate 2>/dev/null || true
    python -m venv "$VENV_PATH"
    # shellcheck disable=SC1090
    source "$VENV_PATH/bin/activate"
fi

PY_BIN="$VENV_PATH/bin/python"
PIP_BIN="$VENV_PATH/bin/pip"

if [ ! -x "$PY_BIN" ]; then
    warn "Unable to locate python inside venv even after recreation"
fi

log "Python executable: $PY_BIN"
"$PY_BIN" -V

if [ -x "$PIP_BIN" ]; then
    log "pip executable: $PIP_BIN"
    "$PIP_BIN" -V
else
    warn "pip executable missing in venv; bootstrapping"
    "$PY_BIN" -m ensurepip --upgrade
    PIP_BIN="$VENV_PATH/bin/pip"
fi

if "$PY_BIN" -c "import django" >/dev/null 2>&1; then
    log "Django import succeeded"
else
    warn "Django import failed; installing requirements"
    "$PIP_BIN" install --no-cache-dir -r requirements.txt
fi

log "Running database migrations"
"$PY_BIN" manage.py migrate --noinput

log "Installed packages snapshot"
"$PIP_BIN" freeze | head -n 40 || warn "pip freeze failed"

log "Launching Django runserver"
exec "$PY_BIN" manage.py runserver 0.0.0.0:8000
