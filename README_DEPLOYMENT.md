# ActivityPass Deployment Guide

## Overview

This guide explains how to deploy and update ActivityPass on your server using the automated scripts.

## How `run_all.py` Works

The `run_all.py` script (for local development) handles:

1. **Environment Setup**: Checks for `.env` file

   - If no `.env` exists, prompts for MySQL credentials
   - Reads `.env.example` and replaces:
     - `DB_USER=root` → user input
     - `DB_PASSWORD=your-password-here` → user input
     - `DJANGO_SECRET_KEY=change-me-example` → generated random key
   - **Note**: Does NOT handle `VITE_AMAP_KEY` - remains as placeholder

2. **Virtual Environment**: Creates Python venv in `backend/.venv`

3. **Dependencies**: Installs Python packages from `requirements.txt`

4. **Database**: Runs Django migrations

5. **Frontend**: Installs npm packages and builds/serves React app

## Server Deployment Process

### Initial Deployment

1. **Transfer files to server**:

   ```bash
   scp scripts/sh/deploy.sh root@120.55.94.224:/root/
   scp scripts/sh/update.sh root@120.55.94.224:/root/
   scp scripts/sh/status.sh root@120.55.94.224:/root/
   ```

2. **On server, run initial deployment**:

   ```bash
   cd /www/wwwroot
   sudo mkdir -p activitypass
   sudo chown $USER:$USER activitypass
   cd activitypass

   # Clone repository
   git clone https://github.com/Al-rimi/ActivityPass.git .

   # Make scripts executable
   chmod +x scripts/sh/deploy.sh scripts/sh/update.sh scripts/sh/status.sh

   # Run deployment
   ./scripts/sh/deploy.sh
   ```

3. **What deploy.sh does** (1Panel-optimized):
   - Automatically detects 1Panel directory structure (`/www/wwwroot/`)
   - Installs Node.js and MariaDB
   - Prompts for database configuration
   - Prompts for AMap API key (optional)
   - Sets up Python virtual environment
   - Installs dependencies and runs migrations
   - Builds React frontend
   - Creates 1Panel-compatible directory structure with `public/` folder
   - Creates `start.sh`, `stop.sh`, and `health.sh` scripts for 1Panel management
   - Sets proper permissions for 1Panel

### Environment Variables Setup

The deployment script handles these variables:

- **Database**: `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **Security**: `DJANGO_SECRET_KEY` (auto-generated)
- **Debug**: `DJANGO_DEBUG=false` (production)
- **Hosts**: `DJANGO_ALLOWED_HOSTS` (needs manual update)
- **Maps**: `VITE_AMAP_KEY` (optional, prompted during setup)

### Update Process

For future updates, simply run:

```bash
cd /www/wwwroot/activitypass
./scripts/sh/update.sh
```

**What update.sh does**:

1. **Git Pull**: Gets latest changes from repository
2. **Backup .env**: Preserves current configuration
3. **Update Dependencies**: Python and Node.js packages
4. **Database Migrations**: Applies any new migrations
5. **Rebuild Frontend**: Creates new production build
6. **Restart Services**: Reloads Django and Nginx
7. **Cleanup**: Removes old backups (keeps last 5)

## File Structure After Deployment

```
/www/wwwroot/activitypass/
├── .env                    # Environment configuration
├── .env.backup.*          # Backup files (created during updates)
├── public/                # 1Panel website root directory
│   ├── index.html         # React app entry point
│   ├── static/ -> ../backend/static/  # Django static files
│   └── media/ -> ../backend/media/    # Django media files
├── backend/               # Django application
│   ├── .venv/            # Python virtual environment
│   ├── static/           # Collected static files
│   └── media/            # User uploaded files
├── frontend/
│   ├── build/            # Production React build
│   └── node_modules/     # Node.js dependencies
├── start.sh              # 1Panel start script
├── stop.sh               # 1Panel stop script
├── health.sh             # 1Panel health check
├── scripts/
│   └── sh/
│       ├── deploy.sh     # Deployment script
│       ├── update.sh     # Update script
│       └── status.sh     # Status check script
└── 1panel_integration.md # 1Panel configuration guide
```

## Services Configuration

### Django Backend (Port 8000)

- **Management**: 1Panel application manager
- **Start Script**: `/www/wwwroot/activitypass/start.sh`
- **Stop Script**: `/www/wwwroot/activitypass/stop.sh`
- **Health Check**: `/www/wwwroot/activitypass/health.sh`
- **Working Directory**: `/www/wwwroot/activitypass/backend`
- **Virtual Environment**: `/www/wwwroot/activitypass/backend/.venv`

### Nginx (Port 80) - Managed by 1Panel

- **Configuration**: Managed through 1Panel web interface
- **Website Root**: `/www/wwwroot/activitypass/public/`
- **API Proxy**: Configured in 1Panel reverse proxy rules
- **Static Files**: Served directly by Nginx through 1Panel

## 1Panel Integration

After deployment, follow the `1panel_integration.md` guide to:

1. Add ActivityPass as a website in 1Panel
2. Configure reverse proxy rules
3. Set up SSL certificates
4. Configure monitoring and backups

## Access URLs

- **Main Application**: `http://your-server-ip/`
- **API Endpoints**: `http://your-server-ip/api/`
- **Admin Panel**: `http://your-server-ip/admin/`
- **Health Check**: `http://your-server-ip/health/`

## Default Credentials

- **Admin User**: `admin`
- **Admin Password**: `admin123` (change immediately!)

## Security Checklist

- [ ] Update `DJANGO_ALLOWED_HOSTS` with actual domain/IP
- [ ] Change default admin password
- [ ] Set up SSL/HTTPS certificates
- [ ] Configure firewall rules
- [ ] Set up log rotation
- [ ] Enable 1Panel monitoring
- [ ] Configure automated backups

## Troubleshooting

### Common Issues

1. **Permission Errors**:

   ```bash
   sudo chown -R $USER:$USER /www/wwwroot/activitypass
   sudo chown -R www-data:www-data /www/wwwroot/activitypass 2>/dev/null || true
   ```

2. **Database Connection**:

   ```bash
   sudo systemctl status mariadb
   mysql -u activitypass -p activitypass -e "SELECT 1;"
   ```

3. **Backend Not Starting**:

   ```bash
   cd /www/wwwroot/activitypass
   ./health.sh
   ./start.sh
   ```

4. **1Panel Configuration Issues**:
   - Check 1Panel website configuration
   - Verify reverse proxy rules
   - Ensure correct root directory: `/www/wwwroot/activitypass/public/`

### Logs

- **Django Backend**: Check through 1Panel application logs or run `./health.sh` for status
- **Nginx**: Check through 1Panel website logs
- **System**: Check through 1Panel system monitoring
- **Application Logs**: May be available in `/www/wwwroot/activitypass/backend/logs/` (if configured)

## Update Frequency

- Run `./scripts/sh/update.sh` whenever you push changes to the repository
- The script safely preserves your `.env` configuration
- Automatic backups ensure you can rollback if needed

## Support

If you encounter issues:

1. Check the application status: `./scripts/sh/status.sh`
2. Verify all services are running through 1Panel interface
3. Test database connectivity
4. Check file permissions on `/www/wwwroot/activitypass/`
5. Review 1Panel website and application configurations
6. Check 1Panel system logs and monitoring
