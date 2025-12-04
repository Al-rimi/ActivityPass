#!/usr/bin/env bash

set -euo pipefail

ACTION="${1:-auto}"
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
BACKEND_SOURCE="${BACKEND_SOURCE:-build}"
BACKEND_TAR_PATH="${BACKEND_TAR_PATH:-}"
TAG_LATEST="${TAG_LATEST:-true}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-$ROOT_DIR/.env}"
BACKEND_HOST_PORT="${BACKEND_HOST_PORT:-8000}"
BACKEND_CONTAINER_PORT="${BACKEND_CONTAINER_PORT:-8000}"
BACKEND_EXTRA_ARGS="${BACKEND_EXTRA_ARGS:-}"
DEPLOY_BACKEND_CONTAINER="${DEPLOY_BACKEND_CONTAINER:-true}"
FRONTEND_TARGET="${FRONTEND_TARGET:-}"
FRONTEND_OWNER="${FRONTEND_OWNER:-www-data:www-data}"
FRONTEND_PERMISSIONS="${FRONTEND_PERMISSIONS:-755}"
SKIP_FRONTEND="${SKIP_FRONTEND:-false}"
SKIP_BACKEND="${SKIP_BACKEND:-false}"
PULL_FIRST="${PULL_FIRST:-true}"
BACKUP_ENV="${BACKUP_ENV:-true}"
DOCKER_NETWORK="${DOCKER_NETWORK:-activitypass-net}"
ENSURE_NETWORK="${ENSURE_NETWORK:-true}"
DB_AUTOSTART="${DB_AUTOSTART:-false}"
DB_CONTAINER="${DB_CONTAINER:-activitypass-db}"
DB_IMAGE="${DB_IMAGE:-mysql:8.0}"
DB_NAME="${DB_NAME:-activitypass}"
DB_USER="${DB_USER:-activityuser}"
DB_PASSWORD="${DB_PASSWORD:-Str0ngPass!}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-}"
DB_HOST_PORT="${DB_HOST_PORT:-}"
DB_EXTRA_ARGS="${DB_EXTRA_ARGS:---character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci}"
DB_WAIT_SECONDS="${DB_WAIT_SECONDS:-60}"

log() { printf '[INFO] %s\n' "$1"; }
warn() { printf '[WARN] %s\n' "$1" 1>&2; }
err() { printf '[ERR ] %s\n' "$1" 1>&2; }
step() { printf '\n== %s ==\n' "$1"; }

usage() {
    cat <<'EOF'
Usage: scripts/sh/deploy.sh <command> [options]

Commands
    auto        Default. Detect whether to run bootstrap (first deploy) or update
    bootstrap   Provision backend image/container, optional database, and frontend bundle
    update      Sync repo then refresh backend image/container and frontend bundle
    backend     Refresh backend image/container (optional database)
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
    BACKEND_SOURCE       build|pull|load|skip (default: build)
    BACKEND_TAR_PATH     Tarball path when BACKEND_SOURCE=load
    TAG_LATEST           true to also tag the image as :latest
    BACKEND_ENV_FILE     Path to pass as docker --env-file (default: ./.env)
    BACKEND_HOST_PORT    Host port to expose for backend (default: 8000)
    BACKEND_CONTAINER_PORT Container port to expose (default: 8000)
    BACKEND_EXTRA_ARGS   Extra docker run args for backend container
    DEPLOY_BACKEND_CONTAINER true to run the backend container (default: true)
  FRONTEND_TARGET      Absolute path to copy frontend/build into
  FRONTEND_OWNER       Owner to apply to FRONTEND_TARGET (default: www-data:www-data)
  FRONTEND_PERMISSIONS Directory permissions (default: 755)
  SKIP_FRONTEND        true to skip frontend steps
  SKIP_BACKEND         true to skip backend steps
  PULL_FIRST           true to run git fetch/reset on update/backend/frontend
  BACKUP_ENV           true to backup .env before update
    DOCKER_NETWORK       Docker network used for backend/database (default: activitypass-net)
    ENSURE_NETWORK       true to create DOCKER_NETWORK if missing
    DB_AUTOSTART         true to create or start MySQL container automatically
    DB_CONTAINER         Name for the database container (default: activitypass-db)
    DB_IMAGE             Database image reference (default: mysql:8.0)
    DB_NAME              MySQL database name (default: activitypass)
    DB_USER              MySQL database user (default: activityuser)
    DB_PASSWORD          MySQL database password (default: Str0ngPass!)
    DB_ROOT_PASSWORD     Root password when DB_AUTOSTART=true
    DB_HOST_PORT         Host port to publish for MySQL (optional)
    DB_EXTRA_ARGS        Extra docker run args for MySQL container
    DB_WAIT_SECONDS      Seconds to wait after starting MySQL (default: 60)

Examples
    ./scripts/sh/deploy.sh
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

auto_action() {
    if command -v docker >/dev/null 2>&1; then
        if docker ps -a --format '{{.Names}}' | grep -Fx "$BACKEND_CONTAINER" >/dev/null 2>&1; then
            echo "update"
            return
        fi
    fi

    if [[ -f "$ROOT_DIR/.env" ]]; then
        echo "update"
        return
    fi

    echo "bootstrap"
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

    log "Built $BACKEND_IMAGE:$BACKEND_TAG"
}

pull_backend_image() {
    require docker
    step "Pulling backend image $BACKEND_IMAGE:$BACKEND_TAG"
    docker pull "$BACKEND_IMAGE:$BACKEND_TAG"
}

load_backend_image() {
    require docker
    if [[ -z "$BACKEND_TAR_PATH" ]]; then
        err "BACKEND_TAR_PATH must be set when BACKEND_SOURCE=load"
        exit 1
    fi
    if [[ ! -f "$BACKEND_TAR_PATH" ]]; then
        err "Image tarball not found at $BACKEND_TAR_PATH"
        exit 1
    fi
    step "Loading backend image from $BACKEND_TAR_PATH"
    local loaded
    loaded=$(docker load -i "$BACKEND_TAR_PATH")
    log "$loaded"
}

tag_backend_latest() {
    if [[ "$TAG_LATEST" != "true" ]]; then
        return
    fi
    if docker image inspect "$BACKEND_IMAGE:$BACKEND_TAG" >/dev/null 2>&1; then
        docker tag "$BACKEND_IMAGE:$BACKEND_TAG" "$BACKEND_IMAGE:latest"
    else
        warn "Cannot tag $BACKEND_IMAGE:$BACKEND_TAG as latest (image not found)"
    fi
}

ensure_backend_image() {
    if [[ "$SKIP_BACKEND" == "true" ]]; then
        warn "Skipping backend image provisioning (SKIP_BACKEND=true)"
        return
    fi

    case "$BACKEND_SOURCE" in
        build)
            build_backend_image
            ;;
        pull)
            pull_backend_image
            ;;
        load)
            load_backend_image
            ;;
        skip)
            warn "BACKEND_SOURCE=skip; assuming image already available"
            ;;
        *)
            err "Unknown BACKEND_SOURCE: $BACKEND_SOURCE"
            exit 1
            ;;
    esac

    tag_backend_latest
}

ensure_network() {
    if [[ "$ENSURE_NETWORK" != "true" ]]; then
        return
    fi
    if [[ -z "$DOCKER_NETWORK" ]]; then
        return
    fi
    require docker
    if docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
        return
    fi
    step "Creating Docker network $DOCKER_NETWORK"
    docker network create "$DOCKER_NETWORK"
}

resolve_backend_image_ref() {
    if docker image inspect "$BACKEND_IMAGE:$BACKEND_TAG" >/dev/null 2>&1; then
        printf '%s' "$BACKEND_IMAGE:$BACKEND_TAG"
        return 0
    fi
    if docker image inspect "$BACKEND_IMAGE:latest" >/dev/null 2>&1; then
        warn "Falling back to $BACKEND_IMAGE:latest"
        printf '%s' "$BACKEND_IMAGE:latest"
        return 0
    fi
    err "Backend image $BACKEND_IMAGE:$BACKEND_TAG (or :latest) not found."
    exit 1
}

deploy_backend_container() {
    if [[ "$SKIP_BACKEND" == "true" ]]; then
        warn "Skipping backend container deployment (SKIP_BACKEND=true)"
        return
    fi
    if [[ "$DEPLOY_BACKEND_CONTAINER" != "true" ]]; then
        return
    fi
    require docker
    ensure_network

    local image_ref
    image_ref=$(resolve_backend_image_ref)

    if docker ps -a --format '{{.Names}}' | grep -Fx "$BACKEND_CONTAINER" >/dev/null; then
        step "Removing existing backend container $BACKEND_CONTAINER"
        docker rm -f "$BACKEND_CONTAINER" >/dev/null 2>&1 || true
    fi

    local env_file="$BACKEND_ENV_FILE"
    local env_args=()
    if [[ -f "$env_file" ]]; then
        env_args=(--env-file "$env_file")
    else
        warn "Environment file $env_file not found; starting container without --env-file"
    fi

    local publish_args=()
    if [[ -n "$BACKEND_HOST_PORT" ]]; then
        publish_args=(-p "${BACKEND_HOST_PORT}:${BACKEND_CONTAINER_PORT}")
    fi

    local extra_args=()
    if [[ -n "$BACKEND_EXTRA_ARGS" ]]; then
        # shellcheck disable=SC2206
        extra_args=($BACKEND_EXTRA_ARGS)
    fi

    local run_cmd=(docker run -d --name "$BACKEND_CONTAINER")
    if [[ -n "$DOCKER_NETWORK" ]]; then
        run_cmd+=(--network "$DOCKER_NETWORK")
    fi
    run_cmd+=("${env_args[@]}")
    run_cmd+=("${publish_args[@]}")
    run_cmd+=("${extra_args[@]}")
    run_cmd+=("$image_ref")

    step "Starting backend container $BACKEND_CONTAINER using $image_ref"
    "${run_cmd[@]}"
}

maybe_start_database() {
    if [[ "$DB_AUTOSTART" != "true" ]]; then
        return
    fi
    require docker
    ensure_network

    if docker ps -a --format '{{.Names}}' | grep -Fx "$DB_CONTAINER" >/dev/null; then
        local running
        running=$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || echo false)
        if [[ "$running" == "true" ]]; then
            log "Database container $DB_CONTAINER already running"
            return
        fi
        step "Starting existing database container $DB_CONTAINER"
        docker start "$DB_CONTAINER" >/dev/null
    else
        if [[ -z "$DB_ROOT_PASSWORD" ]]; then
            err "DB_ROOT_PASSWORD must be set when DB_AUTOSTART=true"
            exit 1
        fi

        local run_cmd=(docker run -d --name "$DB_CONTAINER")
        if [[ -n "$DOCKER_NETWORK" ]]; then
            run_cmd+=(--network "$DOCKER_NETWORK")
        fi
        if [[ -n "$DB_HOST_PORT" ]]; then
            run_cmd+=(-p "${DB_HOST_PORT}:3306")
        fi
        run_cmd+=(
            -e "MYSQL_DATABASE=$DB_NAME"
            -e "MYSQL_USER=$DB_USER"
            -e "MYSQL_PASSWORD=$DB_PASSWORD"
            -e "MYSQL_ROOT_PASSWORD=$DB_ROOT_PASSWORD"
            "$DB_IMAGE"
        )

        if [[ -n "$DB_EXTRA_ARGS" ]]; then
            # shellcheck disable=SC2206
            local db_extra=($DB_EXTRA_ARGS)
            run_cmd+=(${db_extra[@]})
        fi

        step "Launching database container $DB_CONTAINER"
        "${run_cmd[@]}"
    fi

    if [[ "$DB_WAIT_SECONDS" -gt 0 ]]; then
        step "Waiting ${DB_WAIT_SECONDS}s for database to initialize"
        sleep "$DB_WAIT_SECONDS"
    fi
}

run_backend_pipeline() {
    ensure_backend_image
    maybe_start_database
    deploy_backend_container
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
    local db_line
    if [[ "$DB_AUTOSTART" == "true" ]]; then
        db_line="Check database container: docker ps --filter \"name=${DB_CONTAINER}\""
    else
        db_line="Database container not managed (DB_AUTOSTART=false)"
    fi

    cat <<EOF

Next steps:
    - Verify backend container: docker ps --filter "name=${BACKEND_CONTAINER}"
    - Tail backend logs if needed: docker logs -f ${BACKEND_CONTAINER}
    - Frontend assets synced to: ${FRONTEND_TARGET:-<skipped>}
    - ${db_line}
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