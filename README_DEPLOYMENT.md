# ActivityPass Deployment Guide

Updated for the virtualenv-based deployment workflow and the unified deployment tooling.

---

## Local Development (`run_all.py` recap)

`run_all.py` is still the fastest way to bootstrap a development environment. The script now delegates the heavy lifting to reusable helpers in `scripts/automation/`, but the flow is unchanged:

1. Ensure `.env` exists (prompts for database credentials on first run).
2. Create `backend/.venv` and install Python requirements.
3. Run `manage.py init_app` (migrations + seed data).
4. Optionally install frontend dependencies, build the production bundle, or launch the dev server.

You can invoke it exactly as before:

```bash
python run_all.py --host 0.0.0.0 --port 8000
python run_all.py --skip-seed --no-frontend
```

---

## Production Deployment Overview

`scripts/sh/deploy.sh` provisions and refreshes the backend directly on the host while optionally handling the frontend bundle. It reads runtime secrets from the project-wide `.env` file and relies on built-in defaults for everything else. Supply the frontend domain with `--domain <domain>` (or the `SITE_DOMAIN` environment variable) whenever you want the Vite build copied into 1Panel.

Highlights:

- Maintains a dedicated Python virtual environment in `backend/.venv` and installs dependencies from `backend/requirements.txt`.
- Runs migrations, seed commands, and (optionally) `collectstatic` on every deploy.
- Can wait for the database to become reachable before migrations when `WAIT_FOR_DB=true`.
- Executes a custom `RESTART_COMMAND` so you can hook into systemd, supervisor, or any other process manager.
- Frontend deployment is optional; when you pass `--domain <domain>` the bundle syncs to `/opt/1panel/apps/openresty/openresty/www/sites/<domain>/index` with the correct ownership and permissions.
- Behaves entirely without Docker—everything runs directly on the target server.

---

## One-Time Server Setup

1. **Clone or update the repository** to the desired location (e.g. `/www/wwwroot/activitypass`).

2. **Install required system packages**: make sure `python3`, `python3-venv`, `pip`, `git`, `npm`, and `sudo` are available. `rsync` is optional but recommended for faster frontend syncs.

3. **Configure application secrets**:
   - Ensure `.env` exists before the first deployment (copy `.env.example` and edit, or let the script create it and then tweak credentials).
   - Confirm your database is reachable (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

4. **Decide on optional overrides** (set them inline when running the script):
   - `RUN_COLLECTSTATIC=true` to publish Django static files during each deploy.
   - `WAIT_FOR_DB=true` (and `EXTRA_PIP_PACKAGES="pymysql"`) if the database may need extra time to come online.
   - `RESTART_COMMAND="sudo systemctl restart activitypass"` to hook into your process manager automatically.

5. **Bootstrap the server**:
   ```bash
   chmod +x scripts/sh/deploy.sh
   RESTART_COMMAND="sudo systemctl restart activitypass" \
   ./scripts/sh/deploy.sh bootstrap --domain activitypass.example
   ```
   The bootstrap command will:
   - Create `.env` if missing and generate a strong `DJANGO_SECRET_KEY`.
   - Create or reuse the virtualenv at `backend/.venv` and install Python dependencies.
   - Optionally wait for the database, run migrations, execute the seed command, and call `collectstatic` when enabled.
   - Install frontend dependencies, run `npm run build`, and sync assets to `/opt/1panel/apps/openresty/openresty/www/sites/activitypass.example/index`.

6. **Connect the backend to your process manager**:
   - Configure Gunicorn, Daphne, or your preferred ASGI/WSGI server to use the virtualenv in `backend/.venv`.
   - Export `RESTART_COMMAND` (and optionally `STATUS_COMMAND`) when running the script so subsequent deploys refresh the running service automatically.

---

## Fast Code Updates

When you push new commits, log in to your server and run:

```bash
cd /www/wwwroot/activitypass
./scripts/sh/deploy.sh update
```

`update` performs:

1. `git fetch` + `git reset --hard origin/<branch>` (disable with `PULL_FIRST=false`).
2. Optional `.env` backup with a timestamp suffix (`BACKUP_ENV=true`).
3. Backend pipeline (virtualenv refresh, migrations, seed, collectstatic if enabled).
4. Frontend rebuild and sync when `--domain` (or `SITE_DOMAIN`) is provided and `SKIP_FRONTEND` is false.
5. Optional service restart via `RESTART_COMMAND` and a short summary of next steps.

Additional commands:

- `./scripts/sh/deploy.sh backend` — refresh the backend virtualenv, migrations, seed, collectstatic.
- `./scripts/sh/deploy.sh frontend --domain activitypass.example` — rebuild and sync the frontend bundle only.
- `./scripts/sh/deploy.sh status` — run Django system checks plus any custom `STATUS_COMMAND`.
- `./scripts/sh/deploy.sh help` — full usage details and environment variable overrides.

Tip: If you prefer to manage `git pull` manually on the server, run `PULL_FIRST=false ./scripts/sh/deploy.sh <command>` and the script will respect your working tree.

---

## Backend Runtime Notes

- Virtualenv location: `backend/.venv`. Use `$VENV_DIR/bin/python manage.py <command>` (or `backend\.venv\Scripts\python.exe` on Windows) for manual maintenance.
- Run the script with `RUN_COLLECTSTATIC=true` to publish Django static files during each deploy.
- Enable `WAIT_FOR_DB=true` if your database may take a moment to come online; install `pymysql` via `EXTRA_PIP_PACKAGES="pymysql"` if it is not already present.
- Pair the script with a process manager (systemd, supervisor, etc.) and supply a `RESTART_COMMAND` so deploys automatically reload the application server.

---

## Frontend Publishing Tips

- Pass `--domain <domain>` (or export `SITE_DOMAIN=<domain>`) when running the script so assets sync to `/opt/1panel/apps/openresty/openresty/www/sites/<domain>/index`.
- Files are owned by `www-data:www-data` with `755` permissions; adjust in the script if your nginx user differs.
- The script prefers `rsync`; if unavailable it falls back to `cp` after clearing the directory.
- Configure nginx/1Panel to:
   - Serve the frontend from `FRONTEND_TARGET`.
   - Proxy `/api/` to the backend service (Gunicorn/Uvicorn) on port 8000.
   - Route unknown paths to `/index.html` (`try_files $uri $uri/ /index.html;`).

---

## Troubleshooting

| Symptom | Suggested Checks |
| --- | --- |
| `deploy.sh` complains about missing commands | Ensure `python3`, `python3-venv`, `pip`, `npm`, `git`, and `sudo` are on the PATH. Install the `python3-venv` package if the module is missing. |
| Virtualenv missing or incomplete | Confirm `PYTHON_BIN` points to the interpreter you expect and that it can create virtual environments. |
| Migrations fail because the DB is offline | Enable `WAIT_FOR_DB=true` and install `pymysql` via `EXTRA_PIP_PACKAGES="pymysql"` so the script can poll for readiness. |
| Frontend sync skipped | Provide `--domain <domain>` (or export `SITE_DOMAIN`) and ensure `SKIP_FRONTEND=false`. |
| Service did not restart after deploy | Run the script with `RESTART_COMMAND="sudo systemctl restart activitypass"` (adjust as needed) and confirm the invoking user has permission. |
| Local changes lost after update | `update` runs `git reset --hard`. Disable with `PULL_FIRST=false` if you need a dirty worktree. |

For verbose debugging you can run `bash -x scripts/sh/deploy.sh <command>`.

---

## Security Checklist

- Update `DJANGO_ALLOWED_HOSTS` in `.env` for your domains.
- Rotate default admin credentials immediately after bootstrap.
- Configure HTTPS/SSL via 1Panel and enforce it at the proxy layer.
- Schedule automated backups for your MySQL data and the `.env` file.
- Monitor backend service logs (systemd, supervisor, or 1Panel) after each deployment.

---

## Need Help?

- `./scripts/sh/deploy.sh help` — full list of flags and environment variables.
- `./scripts/sh/deploy.sh status` — run Django's system check (`manage.py check --deploy`) plus any custom `STATUS_COMMAND`.
- Re-run `bootstrap` in a clean clone to rebuild artefacts without touching the live service if you need to troubleshoot offline.
