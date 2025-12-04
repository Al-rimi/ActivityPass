# ActivityPass Deployment Guide

Updated for the backend-only Docker build and the new unified deployment tooling.

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

`scripts/sh/deploy.sh` is now the single entry point for server deployments. It exposes explicit sub-commands and reads optional overrides from `deploy.env` (copy `deploy.env.example`).

Highlights:

- Backend Dockerfile lives in `backend/Dockerfile`; the build context is the `backend/` folder only.
- Repository-level `.dockerignore` keeps the frontend and tooling out of the Docker context.
- Frontend deployment is optional—only runs when `FRONTEND_TARGET` is configured.
- Every build produces the tags `activitypass-backend:<git-sha>` and `activitypass-backend:latest`, ideal for 1Panel refreshes.

---

## One-Time Server Setup

1. **Clone or update the repository** to the desired location (e.g. `/www/wwwroot/activitypass`).

2. **Prepare deployment settings**:
   ```bash
   cd /www/wwwroot/activitypass
   cp deploy.env.example deploy.env
   ```
   Adjust any values you need—image name, frontend target directory, nginx user, etc. Leave a variable unset to stick with the default.

3. **Verify environment variables**:
   - Ensure `.env` exists before the first deployment (copy `.env.example` and edit, or let the script create it and then tweak credentials).
   - Confirm your database is reachable (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

4. **Bootstrap build artefacts**:
   ```bash
   chmod +x scripts/sh/deploy.sh
   ./scripts/sh/deploy.sh bootstrap
   ```
   This will:
   - Create `.env` if missing and generate a strong `DJANGO_SECRET_KEY`.
   - Build the backend Docker image (`activitypass-backend:<git-sha>` + `latest`).
   - Install frontend dependencies and run `npm run build` (skip by setting `SKIP_FRONTEND=true`).
   - Sync the Vite build output to `FRONTEND_TARGET` when configured (handy for 1Panel nginx sites).

5. **Finish configuration inside 1Panel**:
   - Point your runtime/container to the freshly built `activitypass-backend:latest` image.
   - Mirror the `.env` settings in 1Panel (database credentials, allowed hosts, etc.).
   - If you copied frontend assets, set the website root to `FRONTEND_TARGET` and make sure SPA routing falls back to `index.html`.

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
3. Backend Docker rebuild and retag.
4. Frontend rebuild and sync if `FRONTEND_TARGET` is set and `SKIP_FRONTEND` is false.
5. Summary of what changed and reminders to redeploy the container in 1Panel.

Additional commands:

- `./scripts/sh/deploy.sh backend` — rebuild image only.
- `./scripts/sh/deploy.sh frontend` — rebuild & sync frontend bundle only.
- `./scripts/sh/deploy.sh status` — quick Docker overview for the configured container name.
- `./scripts/sh/deploy.sh help` — full usage details and environment variable overrides.

Tip: If you prefer to manage `git pull` manually on the server, set `PULL_FIRST=false` in `deploy.env` and the script will respect your working tree.

---

## Backend Image Notes

- Base image: `python:3.12-slim` with `bash`, `gcc`, and MySQL headers installed.
- Entry point: `backend/entrypoint.sh` (Gunicorn + migrations + optional seeding).
- Build context: only `backend/` thanks to both `backend/.dockerignore` and the top-level `.dockerignore`.
- Consider pushing the `activitypass-backend:<git-sha>` tag to your private registry if you want 1Panel to pull instead of building locally.

---

## Frontend Publishing Tips

- Set `FRONTEND_TARGET` in `deploy.env` (e.g. `/opt/1panel/apps/openresty/openresty/www/sites/activitypass/index`).
- Use `FRONTEND_OWNER` to match your web server user (`www-data:www-data`, `nginx:nginx`, etc.).
- The script prefers `rsync`; if unavailable it falls back to `cp` after clearing the directory.
- Configure nginx/1Panel to:
  - Serve the frontend from `FRONTEND_TARGET`.
  - Proxy `/api/` to the backend container on port 8000.
  - Route unknown paths to `/index.html` (`try_files $uri $uri/ /index.html;`).

---

## Troubleshooting

| Symptom | Suggested Checks |
| --- | --- |
| `deploy.sh` complains about missing commands | Ensure `docker`, `npm`, `git`, and `sudo` are available on the PATH. |
| `docker build` cannot find files | Keep the repository layout intact (`backend/requirements.txt`, `backend/manage.py`, etc.). |
| Frontend sync skipped | `FRONTEND_TARGET` not set or `SKIP_FRONTEND=true`. Update `deploy.env`. |
| 1Panel still uses the old image | Redeploy or restart the runtime so it pulls `activitypass-backend:latest` (or use the explicit `<git-sha>` tag printed in the summary). |
| Local changes lost after update | `update` runs `git reset --hard`. Disable with `PULL_FIRST=false` if you need a dirty worktree. |

For verbose debugging you can run `bash -x scripts/sh/deploy.sh <command>`.

---

## Security Checklist

- Update `DJANGO_ALLOWED_HOSTS` in `.env` for your domains.
- Rotate default admin credentials immediately after bootstrap.
- Configure HTTPS/SSL via 1Panel and enforce it at the proxy layer.
- Schedule automated backups for your MySQL data and the `.env` file.
- Monitor container logs from within 1Panel after each deployment.

---

## Need Help?

- `./scripts/sh/deploy.sh help` — full list of flags and environment variables.
- `./scripts/sh/deploy.sh status` — confirm the backend container is running with the expected image.
- Re-run `bootstrap` in a clean clone to rebuild artefacts without touching the live container if you need to troubleshoot offline.
