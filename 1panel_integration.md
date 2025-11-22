# 1Panel Integration Guide for ActivityPass

## Overview

ActivityPass is now deployed and optimized for 1Panel management. The `scripts/sh/deploy.sh` script handles the initial setup automatically, creating the proper directory structure and management scripts. This guide shows how to complete the 1Panel integration after running the deployment script.

## Deployment Location

The deployment script automatically detects and uses the best location for 1Panel:

- **Primary**: `/www/wwwroot/activitypass/` (1Panel standard - your setup)
- **Fallback**: `/var/www/activitypass/`
- **Last Resort**: `/opt/activitypass/`

**Note**: The `scripts/sh/deploy.sh` script now handles the initial deployment and creates the proper directory structure automatically.

## Directory Structure After Deployment

```
/www/wwwroot/activitypass/          # Main project directory
├── public/                        # 1Panel website root (frontend)
│   ├── index.html
│   ├── static/ -> ../backend/static/
│   └── media/ -> ../backend/media/
├── backend/                       # Django application
│   ├── .venv/                    # Python virtual environment
│   ├── static/                   # Django static files
│   └── media/                    # User uploaded files
├── frontend/
│   ├── build/                    # React production build
│   └── node_modules/
├── .env                          # Environment configuration
├── start.sh                      # 1Panel startup script
├── stop.sh                       # 1Panel stop script
└── health.sh                     # 1Panel health check
```

## 1Panel Website Configuration

### Step 1: Access 1Panel

1. Open browser: `http://your-server-ip:9999`
2. Log in with your 1Panel credentials

### Step 2: Add Website

1. Go to **Website** → **Add Site**
2. Configure basic settings:
   - **Domain**: `activitypass.yourdomain.com` or your server IP
   - **Type**: `Reverse Proxy`
   - **Root Directory**: `/www/wwwroot/activitypass/public/` (or your deployment path)
   - **PHP Version**: `Off` (this is a Python/Node.js app)

### Step 3: Configure Reverse Proxy Rules

Set up advanced proxy rules for the SPA + API architecture:

#### Frontend (Root Path)

- **Path**: `/`
- **Proxy Type**: `File`
- **Proxy Address**: `file:///www/wwwroot/activitypass/public/`
- **Index Files**: `index.html`
- **Try Files**: `$uri $uri/ /index.html`

#### API Backend

- **Path**: `/api/`
- **Proxy Type**: `HTTP`
- **Proxy Address**: `http://127.0.0.1:8000`
- **Strip Prefix**: `true`
- **Headers**:
  - `Host: $host`
  - `X-Real-IP: $remote_addr`
  - `X-Forwarded-For: $proxy_add_x_forwarded_for`
  - `X-Forwarded-Proto: $scheme`

#### Static Files

- **Path**: `/static/`
- **Proxy Type**: `File`
- **Proxy Address**: `file:///www/wwwroot/activitypass/backend/static/`
- **Cache**: Enable with 1 year expiry

#### Media Files

- **Path**: `/media/`
- **Proxy Type**: `File`
- **Proxy Address**: `file:///www/wwwroot/activitypass/backend/media/`
- **Cache**: Enable with 30 days expiry

### Step 4: SSL Configuration

1. Go to **SSL Certificate** → **Add Certificate**
2. Choose **Let's Encrypt**
3. Add your domain and enable auto-renewal
4. 1Panel will automatically redirect HTTP to HTTPS

## 1Panel Application Management

### Step 5: Add Application

1. Go to **App Store** → **Custom Application**
2. Configure:
   - **Name**: `ActivityPass Backend`
   - **Path**: `/www/wwwroot/activitypass`
   - **Start Command**: `./start.sh`
   - **Stop Command**: `./stop.sh`
   - **Health Check**: `./health.sh`
   - **Port**: `8000`
   - **Process Name**: `manage.py`

### Step 6: Configure Environment

1. In the application settings, add environment variables:
   - **PYTHONPATH**: `/www/wwwroot/activitypass/backend`
   - **DJANGO_SETTINGS_MODULE**: `ActivityPass.settings`

## Monitoring and Logs

### Step 7: Add Monitoring

1. Go to **Monitor** → **Add Monitor**
2. Configure:
   - **Name**: `ActivityPass Health`
   - **Type**: `Process`
   - **Process**: `manage.py runserver`
   - **URL**: `http://127.0.0.1:8000/health/` (if you add this endpoint)

### Step 8: Log Management

1. Go to **Logs** → **Add Log**
2. Configure:
   - **Name**: `ActivityPass Backend`
   - **Path**: `/www/wwwroot/activitypass/backend/logs/` (create this directory)
   - **Format**: `Custom`
   - **Pattern**: Django log format

## Backup Configuration

### Step 9: Database Backup

1. Go to **Database** → **Add Database**
2. Configure:
   - **Type**: MySQL/MariaDB
   - **Host**: `localhost`
   - **Database**: `activitypass`
   - **Username**: `activitypass`
   - **Password**: Your configured password

### Step 10: Application Backup

1. Go to **Backup** → **Add Plan**
2. Configure:
   - **Name**: `ActivityPass Full Backup`
   - **Type**: `Directory`
   - **Path**: `/www/wwwroot/activitypass`
   - **Database**: Include the MySQL database
   - **Schedule**: Daily at 2 AM
   - **Retention**: 7 days

## 1Panel Control Panel Features

### Application Control

- **Start/Stop/Restart**: Use 1Panel's application manager
- **Resource Monitoring**: CPU, memory, disk usage
- **Log Viewing**: Real-time log streaming
- **Process Management**: View and manage running processes

### Website Management

- **SSL Management**: Automatic certificate renewal
- **Domain Management**: Add multiple domains
- **Redirect Rules**: Configure URL redirects
- **Access Control**: IP restrictions, basic auth

### Database Management

- **phpMyAdmin Access**: Web-based database management
- **Backup/Restore**: Automated database backups
- **User Management**: Database user permissions
- **Query Execution**: Run SQL queries

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**

   - Check if backend is running: `./health.sh`
   - Verify proxy configuration in 1Panel
   - Check Django logs

2. **404 on API calls**

   - Ensure `/api/` proxy rule is configured
   - Check backend is running on port 8000
   - Verify `strip prefix` is enabled

3. **Static files not loading**

   - Check file permissions on static/media directories
   - Verify symbolic links are created
   - Check 1Panel file proxy configuration

4. **Database connection error**
   - Verify database credentials in `.env`
   - Check MariaDB service status
   - Test database connectivity

### Manual Commands (if needed)

```bash
# Check application status
cd /www/wwwroot/activitypass
./health.sh

# Start manually
./start.sh

# Stop manually
./stop.sh

# View logs
tail -f /www/wwwroot/activitypass/backend/logs/django.log

# Check database
mysql -u activitypass -p activitypass -e "SELECT 1;"
```

## Performance Optimization

### 1Panel Optimizations

1. **Enable Caching**: Configure browser caching for static assets
2. **Gzip Compression**: Enable compression in website settings
3. **CDN Integration**: Use 1Panel's CDN features if available

### Application Optimizations

1. **Static File Serving**: Ensure Nginx serves static files directly
2. **Database Indexing**: Monitor and optimize database queries
3. **Caching**: Implement Redis for session caching (optional)

## Security Checklist

- [ ] Change default admin password
- [ ] Enable SSL/HTTPS
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable 2FA for 1Panel admin
- [ ] Monitor failed login attempts
- [ ] Keep dependencies updated
- [ ] Regular security scans

## Access Information

- **1Panel Admin**: `http://your-server-ip:9999`
- **ActivityPass Frontend**: `https://your-domain/`
- **ActivityPass Admin**: `https://your-domain/admin/`
- **API Documentation**: `https://your-domain/api/`

## Support

For issues:

1. Check 1Panel logs in the web interface
2. Review application logs
3. Verify configuration settings
4. Check system resources
5. Contact 1Panel community or ActivityPass support

The application is now fully integrated with 1Panel for comprehensive management! 🎉
