#!/usr/bin/env bash

set -euo pipefail

ACTION="${1:-auto}"
if [[ $# -gt 0 ]]; then
    shift
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

SITE_DOMAIN="${SITE_DOMAIN:-}"

GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
BACKEND_CONTEXT="${BACKEND_CONTEXT:-$ROOT_DIR/backend}"
REQUIREMENTS_FILE="${REQUIREMENTS_FILE:-$BACKEND_CONTEXT/requirements.txt}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
MANAGE_PY="${MANAGE_PY:-$BACKEND_CONTEXT/manage.py}"
INSTALL_REQUIREMENTS="${INSTALL_REQUIREMENTS:-true}"
PIP_UPGRADE="${PIP_UPGRADE:-true}"
EXTRA_PIP_PACKAGES="${EXTRA_PIP_PACKAGES:-}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
MIGRATION_FLAGS="${MIGRATION_FLAGS:---noinput}"
RUN_SEED="${RUN_SEED:-true}"
SEED_COMMAND="${SEED_COMMAND:-seed_students}"
RUN_COLLECTSTATIC="${RUN_COLLECTSTATIC:-false}"
COLLECTSTATIC_ARGS="${COLLECTSTATIC_ARGS:---noinput}"
WAIT_FOR_DB="${WAIT_FOR_DB:-false}"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-120}"
DB_WAIT_INTERVAL="${DB_WAIT_INTERVAL:-5}"
RESTART_COMMAND="${RESTART_COMMAND:-}"
STATUS_COMMAND="${STATUS_COMMAND:-}"
FRONTEND_BASE_PATH="/opt/1panel/apps/openresty/openresty/www/sites"
FRONTEND_OWNER="www-data:www-data"
FRONTEND_PERMISSIONS="755"
FRONTEND_TARGET=""
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
ENV_BACKUP_DIR="${ENV_BACKUP_DIR:-$ROOT_DIR/.backups}"
USE_VENV="${USE_VENV:-true}"
if [[ "$USE_VENV" == "true" ]]; then
    VENV_DIR="${VENV_DIR:-$BACKEND_CONTEXT/.venv}"
    VENV_PYTHON="${VENV_PYTHON:-$VENV_DIR/bin/python}"
else
    VENV_DIR="${VENV_DIR:-}"
    VENV_PYTHON="${VENV_PYTHON:-$PYTHON_BIN}"
fi
SKIP_FRONTEND="${SKIP_FRONTEND:-false}"
SKIP_BACKEND="${SKIP_BACKEND:-false}"
PULL_FIRST="${PULL_FIRST:-true}"
BACKUP_ENV="${BACKUP_ENV:-true}"

log() { printf '[INFO] %s\n' "$1"; }
warn() { printf '[WARN] %s\n' "$1" 1>&2; }
err() { printf '[ERR ] %s\n' "$1" 1>&2; }
step() { printf '\n== %s ==\n' "$1"; }

usage() {
    cat <<'EOF'
Usage: scripts/sh/deploy.sh <command> [options]

Commands
  auto        Detect whether to run bootstrap (first deploy) or update
  bootstrap   Create environment, install deps, run migrations/seed, build frontend
  update      Sync repo then refresh backend environment and frontend bundle
  backend     Run backend pipeline only (install, migrate, seed, restart)
  frontend    Build frontend bundle and sync to target directory
  status      Run Django system check and optional STATUS_COMMAND
  help        Show this message

Options
    --domain <domain>    Override the frontend domain (e.g. activitypass.example)

Environment variables (optional overrides set via the shell environment):
  GIT_REMOTE             Git remote to pull from (default: origin)
  GIT_BRANCH             Branch to track (default: main)
  BACKEND_CONTEXT        Path to Django backend (default: ./backend)
  REQUIREMENTS_FILE      Pip requirements file (default: backend/requirements.txt)
    PYTHON_BIN             Python executable used for backend tasks (default: python3)
    USE_VENV               true to create/use a virtualenv (default: true)
    VENV_DIR               Virtualenv directory (default: backend/.venv)
  INSTALL_REQUIREMENTS   true to install backend dependencies (default: true)
  EXTRA_PIP_PACKAGES     Additional pip packages to install (space separated)
  RUN_MIGRATIONS         true to run manage.py migrate (default: true)
  MIGRATION_FLAGS        Flags passed to migrate (default: --noinput)
  RUN_SEED               true to run the seed command (default: true)
  SEED_COMMAND           Management command to seed data (default: seed_students)
  RUN_COLLECTSTATIC      true to run collectstatic (default: false)
  COLLECTSTATIC_ARGS     Flags passed to collectstatic (default: --noinput)
  WAIT_FOR_DB            true to wait for the database before migrations
  DB_WAIT_TIMEOUT        Seconds to wait for DB readiness (default: 120)
  DB_WAIT_INTERVAL       Seconds between DB checks (default: 5)
    RESTART_COMMAND        Shell command to restart backend service (optional)
    STATUS_COMMAND         Extra status command run with `status` (optional)
  SKIP_FRONTEND          true to skip frontend steps
  SKIP_BACKEND           true to skip backend steps
  PULL_FIRST             true to run git fetch/reset before update (default: true)
  BACKUP_ENV             true to backup .env before update (default: true)

Examples
    ./scripts/sh/deploy.sh
    ./scripts/sh/deploy.sh bootstrap
    ./scripts/sh/deploy.sh update --domain activitypass.example
    SKIP_FRONTEND=true ./scripts/sh/deploy.sh backend
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain)
            if [[ $# -lt 2 ]]; then
                err "--domain requires a value"
                exit 1
            fi
            SITE_DOMAIN="$2"
            shift 2
            ;;
        --domain=*)
            SITE_DOMAIN="${1#*=}"
            shift
            ;;
        *)
            err "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

require() {
    if ! command -v "$1" >/dev/null 2>&1; then
        err "Missing required command: $1"
        exit 1
    fi
}

resolve_python_bin() {
    local candidate="$1"
    if [[ -z "$candidate" ]]; then
        return 1
    fi
    if [[ -x "$candidate" ]]; then
        printf '%s\n' "$candidate"
        return 0
    fi
    local resolved
    resolved="$(command -v "$candidate" 2>/dev/null || true)"
    if [[ -n "$resolved" ]]; then
        printf '%s\n' "$resolved"
        return 0
    fi
    return 1
}

ensure_virtualenv() {
    if [[ "$USE_VENV" != "true" ]]; then
        return
    fi
    if [[ "$SKIP_BACKEND" == "true" ]]; then
        return
    fi
    if [[ -x "$VENV_PYTHON" ]]; then
        return
    fi
    require "$PYTHON_BIN"
    step "Creating Python virtual environment ($VENV_DIR)"
    "$PYTHON_BIN" -m venv "$VENV_DIR"
}

install_backend_dependencies() {
    if [[ "$SKIP_BACKEND" == "true" ]]; then
        return
    fi
    if [[ "$INSTALL_REQUIREMENTS" != "true" ]]; then
        return
    fi
    local python_bin
    python_bin="$(resolve_python_bin "$VENV_PYTHON" || true)"
    if [[ -z "$python_bin" ]]; then
        err "Python executable not found at or via PATH: $VENV_PYTHON"
        exit 1
    fi
    if [[ ! -f "$REQUIREMENTS_FILE" ]]; then
        warn "Requirements file not found at $REQUIREMENTS_FILE; skipping install"
        return
    fi
    step "Installing backend dependencies"
    local -a pip_cmd=("$python_bin" -m pip)
    if [[ "$PIP_UPGRADE" == "true" ]]; then
        "${pip_cmd[@]}" install --upgrade pip wheel
    fi
    "${pip_cmd[@]}" install -r "$REQUIREMENTS_FILE"
    if [[ -n "$EXTRA_PIP_PACKAGES" ]]; then
        # shellcheck disable=SC2086
        "${pip_cmd[@]}" install $EXTRA_PIP_PACKAGES
    fi
}

load_env_vars() {
    local env_path="$ENV_FILE"
    if [[ -f "$env_path" ]]; then
        set -a
        # shellcheck disable=SC1090
        source "$env_path"
        set +a
    fi
}

wait_for_database() {
    if [[ "$WAIT_FOR_DB" != "true" ]]; then
        return
    fi
    if [[ -z "${DB_HOST:-}" ]]; then
        warn "DB_HOST not set; skipping database wait"
        return
    fi
    local python_bin
    python_bin="$(resolve_python_bin "$VENV_PYTHON" || true)"
    if [[ -z "$python_bin" ]]; then
        warn "Python executable unavailable for database wait: $VENV_PYTHON"
        return
    fi
    if ! "$python_bin" -c "import pymysql" >/dev/null 2>&1; then
        warn "pymysql not available; skipping database wait"
        return
    fi
    local timeout="$DB_WAIT_TIMEOUT"
    local interval="$DB_WAIT_INTERVAL"
    local start
    start=$(date +%s)
    step "Waiting for database at ${DB_HOST}:${DB_PORT:-3306}"
    while true; do
        if "$python_bin" - <<'PY'
    import os
    import pymysql

    def check():
        host=os.environ.get("DB_HOST")
        user=os.environ.get("DB_USER")
        password=os.environ.get("DB_PASSWORD")
        name=os.environ.get("DB_NAME")
        port=int(os.environ.get("DB_PORT", "3306"))
        conn=pymysql.connect(host=host, user=user, password=password, database=name, port=port, connect_timeout=5)
        conn.close()

    try:
        check()
    except Exception as exc:
        raise SystemExit(1) from exc
PY
        then
            break
        fi
        local now
        now=$(date +%s)
        if (( now - start >= timeout )); then
            err "Database did not become ready within ${timeout}s"
            exit 1
        fi
        sleep "$interval"
    done
}

run_manage() {
    local python_bin
    python_bin="$(resolve_python_bin "$VENV_PYTHON" || true)"
    if [[ -z "$python_bin" ]]; then
        err "Python executable not found at or via PATH: $VENV_PYTHON"
        exit 1
    fi
    if [[ ! -f "$MANAGE_PY" ]]; then
        err "manage.py not found at $MANAGE_PY"
        exit 1
    fi
    (cd "$BACKEND_CONTEXT" && "$python_bin" "$MANAGE_PY" "$@")
}

apply_migrations() {
    if [[ "$RUN_MIGRATIONS" != "true" ]]; then
        return
    fi
    step "Applying database migrations"
    local args=()
    if [[ -n "$MIGRATION_FLAGS" ]]; then
        # shellcheck disable=SC2206
        args=($MIGRATION_FLAGS)
    fi
    run_manage migrate "${args[@]}"
}

run_seed_command() {
    if [[ "$RUN_SEED" != "true" ]]; then
        return
    fi
    if [[ -z "$SEED_COMMAND" ]]; then
        return
    fi
    step "Running seed command ($SEED_COMMAND)"
    # shellcheck disable=SC2086
    run_manage $SEED_COMMAND
}

collect_static() {
    if [[ "$RUN_COLLECTSTATIC" != "true" ]]; then
        return
    fi
    step "Collecting static files"
    local args=()
    if [[ -n "$COLLECTSTATIC_ARGS" ]]; then
        # shellcheck disable=SC2206
        args=($COLLECTSTATIC_ARGS)
    fi
    run_manage collectstatic "${args[@]}"
}

restart_backend_service() {
    if [[ -z "$RESTART_COMMAND" ]]; then
        return
    fi
    step "Restarting backend service"
    bash -c "$RESTART_COMMAND"
}

run_backend_pipeline() {
    if [[ "$SKIP_BACKEND" == "true" ]]; then
        warn "Skipping backend tasks (SKIP_BACKEND=true)"
        return
    fi
    ensure_virtualenv
    install_backend_dependencies
    load_env_vars
    wait_for_database
    apply_migrations
    run_seed_command
    collect_static
    restart_backend_service
}

check_backend_status() {
    if [[ "$SKIP_BACKEND" == "true" ]]; then
        warn "Backend tasks skipped; nothing to check"
        return
    fi
    ensure_virtualenv
    load_env_vars
    step "Running Django system check"
    run_manage check --deploy
    if [[ -n "$STATUS_COMMAND" ]]; then
        step "Running custom status command"
        bash -c "$STATUS_COMMAND"
    fi
}

git_refresh() {
    if [[ "$PULL_FIRST" != "true" ]]; then
        return
    fi
    if [[ ! -d "$ROOT_DIR/.git" ]]; then
        warn "No git repository found; skipping git refresh"
        return
    fi
    step "Refreshing git repository ($GIT_REMOTE/$GIT_BRANCH)"
    git fetch "$GIT_REMOTE" "$GIT_BRANCH"
    git reset --hard "$GIT_REMOTE/$GIT_BRANCH"
}

ensure_env_file() {
    if [[ -f "$ENV_FILE" ]]; then
        return
    fi
    err "Environment file not found at $ENV_FILE"
    err "Create the file or set ENV_FILE to the correct path before deploying"
    exit 1
}

backup_env_file() {
    if [[ "$BACKUP_ENV" != "true" ]]; then
        return
    fi
    if [[ ! -f "$ENV_FILE" ]]; then
        warn "No environment file at $ENV_FILE; skipping backup"
        return
    fi
    mkdir -p "$ENV_BACKUP_DIR"
    local timestamp
    timestamp="$(date +%Y%m%d%H%M%S)"
    local backup_path="$ENV_BACKUP_DIR/.env.${timestamp}.bak"
    cp "$ENV_FILE" "$backup_path"
    log "Backed up $ENV_FILE to $backup_path"
}

ensure_site_domain() {
    if [[ "$SKIP_FRONTEND" == "true" ]]; then
        return
    fi
    if [[ -n "$SITE_DOMAIN" ]]; then
        return
    fi
    if [[ -t 0 ]]; then
        read -rp "Enter site domain (e.g. example.com): " SITE_DOMAIN
    fi
    if [[ -z "$SITE_DOMAIN" ]]; then
        err "SITE_DOMAIN must be provided via --domain or environment variable when frontend deployment is enabled"
        exit 1
    fi
}

build_frontend_bundle() {
    if [[ "$SKIP_FRONTEND" == "true" ]]; then
        warn "Skipping frontend build (SKIP_FRONTEND=true)"
        return
    fi

    require npm
    step "Building frontend bundle"
    pushd "$ROOT_DIR/frontend" >/dev/null
    if [[ -f package-lock.json ]]; then
        npm ci
    else
        npm install
    fi
    npm run build
    popd >/dev/null
}

sync_frontend_bundle() {
    if [[ "$SKIP_FRONTEND" == "true" ]]; then
        return
    fi

    ensure_site_domain

    local target="$FRONTEND_BASE_PATH/$SITE_DOMAIN/index"
    local source_dir="$ROOT_DIR/frontend/build"
    if [[ ! -d "$source_dir" ]]; then
        warn "Frontend build output not found at $source_dir"
        return
    fi

    step "Syncing frontend bundle to $target"
    sudo mkdir -p "$target"
    if command -v rsync >/dev/null 2>&1; then
        sudo rsync -a --delete "$source_dir/" "$target/"
    else
        sudo rm -rf "${target:?}/"*
        sudo cp -r "$source_dir/"* "$target/"
    fi

    if [[ -n "$FRONTEND_OWNER" ]]; then
        sudo chown -R "$FRONTEND_OWNER" "$target"
    fi
    sudo chmod -R "$FRONTEND_PERMISSIONS" "$target"
    FRONTEND_TARGET="$target"
}

auto_action() {
    if [[ ! -f "$ENV_FILE" ]]; then
        echo "bootstrap"
        return
    fi
    if [[ "$USE_VENV" == "true" && ! -d "$VENV_DIR" ]]; then
        echo "bootstrap"
        return
    fi
    echo "update"
}

print_next_steps() {
        local backend_runtime
        if [[ "$USE_VENV" == "true" ]]; then
                backend_runtime="${VENV_DIR:-<missing>}"
        else
                backend_runtime="system python ($VENV_PYTHON)"
        fi
    cat <<EOF

Next steps:
    - Backend runtime: $backend_runtime
  - Restart command run: ${RESTART_COMMAND:-<none>}
  - Frontend assets synced to: ${FRONTEND_TARGET:-<skipped>}
EOF
}

case "$ACTION" in
    auto)
        ACTION="$(auto_action)"
        log "Auto-detected action: $ACTION"
        "$0" "$ACTION" "$@"
        exit $?
        ;;
    bootstrap)
        ensure_env_file
        run_backend_pipeline
        build_frontend_bundle
        sync_frontend_bundle
        print_next_steps
        ;;
    update)
        git_refresh
        ensure_env_file
        backup_env_file
        run_backend_pipeline
        build_frontend_bundle
        sync_frontend_bundle
        print_next_steps
        ;;
    backend)
        git_refresh
        ensure_env_file
        run_backend_pipeline
        print_next_steps
        ;;
    frontend)
        git_refresh
        build_frontend_bundle
        sync_frontend_bundle
        ;;
    status)
        git_refresh
        ensure_env_file
        check_backend_status
        ;;
    help|-h|--help)
        usage
        ;;
    *)
        err "Unknown command: $ACTION"
        usage
        exit 1
        ;;
esac