#!/usr/bin/env bash

set -euo pipefail

ACTION="${1:-help}"
if [[ $# -gt 0 ]]; then
    shift
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DEPLOY_ENV_PATH="${DEPLOY_ENV_PATH:-$ROOT_DIR/deploy.env}"
if [[ -f "$DEPLOY_ENV_PATH" ]]; then
    # shellcheck disable=SC1090
    source "$DEPLOY_ENV_PATH"
fi

GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"
BACKEND_IMAGE="${BACKEND_IMAGE:-activitypass-backend}"
BACKEND_TAG="${BACKEND_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"
BACKEND_CONTEXT="${BACKEND_CONTEXT:-$ROOT_DIR/backend}"
BACKEND_DOCKERFILE="${BACKEND_DOCKERFILE:-$BACKEND_CONTEXT/Dockerfile}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-activitypass-backend}"
FRONTEND_TARGET="${FRONTEND_TARGET:-}"
FRONTEND_OWNER="${FRONTEND_OWNER:-www-data:www-data}"
FRONTEND_PERMISSIONS="${FRONTEND_PERMISSIONS:-755}"
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
  bootstrap   Build backend image and frontend bundle without pulling
  update      git pull + rebuild backend image and frontend bundle
  backend     Build and tag backend Docker image only
  frontend    Build frontend bundle and sync to target directory
  status      Show container image information reported by Docker
  help        Show this message

Environment variables (set in deploy.env or inline):
  GIT_REMOTE           Git remote to pull from (default: origin)
  GIT_BRANCH           Branch to track (default: main)
  BACKEND_IMAGE        Docker image name (default: activitypass-backend)
  BACKEND_TAG          Optional explicit tag (default: current commit)
  BACKEND_CONTEXT      Build context (default: ./backend)
  BACKEND_DOCKERFILE   Dockerfile path (default: ./backend/Dockerfile)
  FRONTEND_TARGET      Absolute path to copy frontend/build into
  FRONTEND_OWNER       Owner to apply to FRONTEND_TARGET (default: www-data:www-data)
  FRONTEND_PERMISSIONS Directory permissions (default: 755)
  SKIP_FRONTEND        true to skip frontend steps
  SKIP_BACKEND         true to skip backend steps
  PULL_FIRST           true to run git fetch/reset on update/backend/frontend
  BACKUP_ENV           true to backup .env before update

Examples
  ./scripts/sh/deploy.sh bootstrap
  FRONTEND_TARGET=/opt/1panel/apps/openresty/openresty/www/sites/activitypass/index \
    ./scripts/sh/deploy.sh update
  SKIP_FRONTEND=true ./scripts/sh/deploy.sh backend
EOF
}

require() {
    if ! command -v "$1" >/dev/null 2>&1; then
        err "Missing required command: $1"
        exit 1
    fi
}

ensure_env_file() {
    local env_path="$ROOT_DIR/.env"
    local example_path="$ROOT_DIR/.env.example"

    if [[ -f "$env_path" ]]; then
        return
    fi

    if [[ ! -f "$example_path" ]]; then
        warn "No .env.example found; skipping env creation"
        return
    fi

    step "Creating .env from template"
    cp "$example_path" "$env_path"

    local secret
    if command -v python3 >/dev/null 2>&1; then
        secret=$(python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
        )
    else
        secret=$(openssl rand -base64 48 2>/dev/null || uuidgen)
    fi

    if [[ -n "$secret" ]]; then
        sed -i "s|DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=${secret}|" "$env_path"
    fi

    warn "Review $env_path and update database credentials before deploying."
}

backup_env_file() {
    local env_path="$ROOT_DIR/.env"
    if [[ "$BACKUP_ENV" != "true" || ! -f "$env_path" ]]; then
        return
    fi
    local backup_path="${env_path}.backup.$(date +%Y%m%d%H%M%S)"
    cp "$env_path" "$backup_path"
    log "Backed up .env to ${backup_path}"
}

git_refresh() {
    if [[ "$PULL_FIRST" != "true" ]]; then
        return
    fi
    require git
    step "Syncing repository ($GIT_REMOTE/$GIT_BRANCH)"
    git fetch "$GIT_REMOTE" "$GIT_BRANCH"
    git reset --hard "$GIT_REMOTE/$GIT_BRANCH"
}

build_backend_image() {
    if [[ "$SKIP_BACKEND" == "true" ]]; then
        warn "Skipping backend image build (SKIP_BACKEND=true)"
        return
    fi

    require docker
    if [[ ! -f "$BACKEND_DOCKERFILE" ]]; then
        err "Dockerfile not found at $BACKEND_DOCKERFILE"
        exit 1
    fi

    step "Building backend Docker image"
    docker build \
        --file "$BACKEND_DOCKERFILE" \
        --tag "$BACKEND_IMAGE:$BACKEND_TAG" \
        "$BACKEND_CONTEXT"

    docker tag "$BACKEND_IMAGE:$BACKEND_TAG" "$BACKEND_IMAGE:latest"
    log "Built $BACKEND_IMAGE:$BACKEND_TAG"
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

    if [[ -z "$FRONTEND_TARGET" ]]; then
        warn "FRONTEND_TARGET not set; skipping asset sync"
        return
    fi

    local source_dir="$ROOT_DIR/frontend/build"
    if [[ ! -d "$source_dir" ]]; then
        warn "Frontend build output not found at $source_dir"
        return
    fi

    step "Syncing frontend bundle to $FRONTEND_TARGET"
    sudo mkdir -p "$FRONTEND_TARGET"
    if command -v rsync >/dev/null 2>&1; then
        sudo rsync -a --delete "$source_dir/" "$FRONTEND_TARGET/"
    else
        sudo rm -rf "${FRONTEND_TARGET:?}/"*
        sudo cp -r "$source_dir/"* "$FRONTEND_TARGET/"
    fi

    if [[ -n "$FRONTEND_OWNER" ]]; then
        sudo chown -R "$FRONTEND_OWNER" "$FRONTEND_TARGET"
    fi
    sudo chmod -R "$FRONTEND_PERMISSIONS" "$FRONTEND_TARGET"
}

docker_status() {
    require docker
    docker ps --filter "name=${BACKEND_CONTAINER}" --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
}

print_next_steps() {
    cat <<EOF

Next steps:
    - In 1Panel, ensure the runtime/container uses image ${BACKEND_IMAGE}:${BACKEND_TAG}
    - Update environment variables in 1Panel to match the values in .env (if needed)
    - Reload the container or redeploy through 1Panel to apply the new image
    - Frontend assets synced to: ${FRONTEND_TARGET:-<skipped>}
EOF
}

case "$ACTION" in
    bootstrap)
        ensure_env_file
        build_backend_image
        build_frontend_bundle
        sync_frontend_bundle
        print_next_steps
        ;;
    update)
        git_refresh
        ensure_env_file
        backup_env_file
        build_backend_image
        build_frontend_bundle
        sync_frontend_bundle
        print_next_steps
        ;;
    backend)
        git_refresh
        build_backend_image
        print_next_steps
        ;;
    frontend)
        git_refresh
        build_frontend_bundle
        sync_frontend_bundle
        ;;
    status)
        docker_status
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