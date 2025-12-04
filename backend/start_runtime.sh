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

if [ -f .env ]; then
    log "Found .env file"
else
    warn ".env not found in $(pwd)"
fi

VENV_PATH="${SCRIPT_DIR}/.venv"
if [ -d "$VENV_PATH" ]; then
    log "Activating virtualenv at $VENV_PATH"
    # shellcheck disable=SC1090
    source "$VENV_PATH/bin/activate"
else
    warn "Virtualenv missing at $VENV_PATH"
fi

if command -v python >/dev/null 2>&1; then
    log "Python executable: $(command -v python)"
    python -V
else
    warn "python command not found"
fi

if command -v pip >/dev/null 2>&1; then
    log "pip executable: $(command -v pip)"
    pip -V
else
    warn "pip command not found"
fi

if python -c "import django" >/dev/null 2>&1; then
    log "Django import succeeded"
else
    warn "Django import failed; installing requirements"
    python -m pip install --no-cache-dir -r requirements.txt
fi

log "Running database migrations"
python manage.py migrate --noinput

log "Installed packages snapshot"
python -m pip freeze | head -n 40 || warn "pip freeze failed"

log "Launching Django runserver"
exec python manage.py runserver 0.0.0.0:8000
