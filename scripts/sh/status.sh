#!/bin/bash

# ActivityPass Status Check Script
# Run this to check the deployment status and get useful information

echo "🔍 ActivityPass Status Check"
echo "============================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check service status
check_service() {
    local service=$1
    local display_name=$2

    if systemctl is-active --quiet "$service" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $display_name: Running"
    else
        echo -e "${RED}✗${NC} $display_name: Stopped"
    fi
}

# Function to check port
check_port() {
    local port=$1
    local service=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Port $port ($service): Open"
    else
        echo -e "${RED}✗${NC} Port $port ($service): Closed"
    fi
}

# Function to check directory
check_directory() {
    local path=$1
    local display_name=$2

    if [ -d "$path" ]; then
        echo -e "${GREEN}✓${NC} $display_name: Exists"
    else
        echo -e "${RED}✗${NC} $display_name: Missing"
    fi
}

# Function to check file
check_file() {
    local path=$1
    local display_name=$2

    if [ -f "$path" ]; then
        echo -e "${GREEN}✓${NC} $display_name: Exists"
    else
        echo -e "${RED}✗${NC} $display_name: Missing"
    fi
}

echo ""
echo "📊 Services Status:"
echo "-------------------"
# Check if Django backend is running (1Panel-managed)
if pgrep -f "manage.py runserver" > /dev/null; then
    echo -e "${GREEN}✓${NC} Django Backend: Running (1Panel-managed)"
else
    echo -e "${RED}✗${NC} Django Backend: Stopped"
fi

check_service "nginx" "Web Server (1Panel)"
check_service "mariadb" "Database"

echo ""
echo "🔌 Ports Status:"
echo "---------------"
check_port "8000" "Django Backend"
check_port "80" "Nginx Web Server"
check_port "3306" "MariaDB Database"

echo ""
echo "📁 Directory Structure:"
echo "----------------------"
# Check for 1Panel directory structure
if [ -d "/www/wwwroot/activitypass" ]; then
    DEPLOY_DIR="/www/wwwroot/activitypass"
elif [ -d "/var/www/activitypass" ]; then
    DEPLOY_DIR="/var/www/activitypass"
else
    DEPLOY_DIR="/opt/activitypass"
fi

check_directory "$DEPLOY_DIR" "Application Root"
check_directory "$DEPLOY_DIR/backend" "Django Backend"
check_directory "$DEPLOY_DIR/frontend" "React Frontend"
check_directory "$DEPLOY_DIR/backend/.venv" "Python Virtual Environment"
check_directory "$DEPLOY_DIR/frontend/build" "React Production Build"
check_directory "$DEPLOY_DIR/public" "1Panel Website Root"

echo ""
echo "📄 Configuration Files:"
echo "----------------------"
check_file "$DEPLOY_DIR/.env" "Environment Configuration"
check_file "$DEPLOY_DIR/start.sh" "1Panel Start Script"
check_file "$DEPLOY_DIR/stop.sh" "1Panel Stop Script"
check_file "$DEPLOY_DIR/health.sh" "1Panel Health Check"

echo ""
echo "🌐 Application URLs:"
echo "-------------------"

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -n "$SERVER_IP" ]; then
    echo -e "${BLUE}Main Application:${NC} http://$SERVER_IP/"
    echo -e "${BLUE}API Endpoints:${NC} http://$SERVER_IP/api/"
    echo -e "${BLUE}Admin Panel:${NC} http://$SERVER_IP/admin/"
    echo -e "${BLUE}Health Check:${NC} http://$SERVER_IP/health/"
else
    echo -e "${YELLOW}Could not determine server IP${NC}"
    echo -e "${BLUE}Main Application:${NC} http://your-server-ip/"
    echo -e "${BLUE}API Endpoints:${NC} http://your-server-ip/api/"
    echo -e "${BLUE}Admin Panel:${NC} http://your-server-ip/admin/"
    echo -e "${BLUE}Health Check:${NC} http://your-server-ip/health/"
fi

echo ""
echo "📋 Service Status:"
echo "-----------------"

echo "Django Backend Process:"
if pgrep -f "manage.py runserver" > /dev/null; then
    ps aux | grep "manage.py runserver" | grep -v grep | head -1
else
    echo "No Django process running"
fi

echo ""
echo "1Panel Management Scripts:"
if [ -f "$DEPLOY_DIR/start.sh" ]; then
    echo -e "${GREEN}✓${NC} Start script available: $DEPLOY_DIR/start.sh"
else
    echo -e "${RED}✗${NC} Start script missing"
fi

if [ -f "$DEPLOY_DIR/stop.sh" ]; then
    echo -e "${GREEN}✓${NC} Stop script available: $DEPLOY_DIR/stop.sh"
else
    echo -e "${RED}✗${NC} Stop script missing"
fi

if [ -f "$DEPLOY_DIR/health.sh" ]; then
    echo -e "${GREEN}✓${NC} Health check available: $DEPLOY_DIR/health.sh"
else
    echo -e "${RED}✗${NC} Health check missing"
fi

echo ""
echo "💡 Quick Actions:"
echo "----------------"
echo "• Update application: ./scripts/sh/update.sh"
echo "• Start backend: ./start.sh"
echo "• Stop backend: ./stop.sh"
echo "• Health check: ./health.sh"
echo "• Check database: mysql -u activitypass -p activitypass"
echo "• 1Panel interface: http://your-server-ip:9999"

echo ""
echo "✅ Status check completed!"