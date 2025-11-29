#!/bin/bash

# ActivityPass 1Panel-Optimized Deployment Script
# This script deploys ActivityPass in a way that's fully manageable by 1Panel

set -e  # Exit on any error

echo "🚀 ActivityPass 1Panel Deployment..."
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo access."
   exit 1
fi

# Check for existing domain name in .env
DOMAIN_NAME=""
if [ -f .env ]; then
    DOMAIN_NAME=$(grep "^DOMAIN_NAME=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
fi

if [ -z "$DOMAIN_NAME" ]; then
    read -p "Enter domain name: " DOMAIN_NAME
fi

# Ask for deployment folder name (alias)
print_step "Configuring deployment..."
ALIAS="$DOMAIN_NAME"

# Determine the deployment directories
DEPLOY_DIR="/www/wwwroot/activitypass"
SITES_DIR="/opt/1panel/apps/openresty/openresty/www/sites"
FRONTEND_DEPLOY_DIR="${SITES_DIR}/${ALIAS}/index"

print_status "Alias: $ALIAS"
print_status "Backend will be deployed to: $DEPLOY_DIR"
print_status "Frontend will be deployed to: $FRONTEND_DEPLOY_DIR"

# Create deployment directories
print_step "Creating deployment directories..."
sudo mkdir -p "$FRONTEND_DEPLOY_DIR"
sudo chown -R $USER:$USER "$FRONTEND_DEPLOY_DIR"

# Update system and install dependencies
print_step "Installing system dependencies..."
sudo dnf update -y

# Install Node.js
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
    sudo dnf install -y nodejs
    print_status "Node.js installed: $(node --version)"
else
    print_status "Node.js already installed: $(node --version)"
fi

# Check and upgrade Python version if necessary
print_step "Checking Python version..."
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_PYTHON="3.8"

if python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)"; then
    print_status "Python $PYTHON_VERSION is compatible (Django 5.x requires Python 3.8+)"
    PYTHON_CMD="python3"
else
    print_warning "Python $PYTHON_VERSION is too old for Django 5.x. Installing Python 3.8+..."
    
    # Try different methods based on OS
    OS_VERSION=$(cat /etc/os-release | grep -E "^VERSION_ID=" | cut -d'"' -f2 | cut -d'.' -f1)
    OS_NAME=$(cat /etc/os-release | grep -E "^ID=" | cut -d'"' -f2)
    
    if [[ "$OS_NAME" == "centos" ]] && [[ "$OS_VERSION" -ge 8 ]]; then
        # CentOS 8+ has python38 in appstream
        print_status "Installing Python 3.8 on CentOS $OS_VERSION..."
        sudo dnf install -y python38 python38-pip python38-devel
        PYTHON_CMD="python3.8"
    elif [[ "$OS_NAME" == "rocky" ]] || [[ "$OS_NAME" == "almalinux" ]]; then
        # Rocky Linux/AlmaLinux 8+
        print_status "Installing Python 3.8 on $OS_NAME $OS_VERSION..."
        sudo dnf install -y python38 python38-pip python38-devel
        PYTHON_CMD="python3.8"
    elif [[ "$OS_NAME" == "centos" ]] && [[ "$OS_VERSION" -eq 7 ]]; then
        # CentOS 7 - use SCL
        print_status "Installing Python 3.8 via SCL on CentOS 7..."
        sudo yum install -y centos-release-scl
        sudo yum install -y rh-python38 rh-python38-python-pip rh-python38-python-devel
        source /opt/rh/rh-python38/enable
        PYTHON_CMD="python3.8"
    else
        # Try generic python38 package
        print_status "Trying to install python38 package..."
        if sudo dnf install -y python38 python38-pip python38-devel 2>/dev/null; then
            PYTHON_CMD="python3.8"
        else
            print_error "Unable to install Python 3.8+. Please upgrade your system Python manually to version 3.8 or higher."
            print_error "You can try: sudo dnf install python38 python38-pip python38-devel"
            exit 1
        fi
    fi
    
    print_status "Python 3.8+ installed successfully"
fi

# Install MySQL/MariaDB
print_step "Checking database service..."
MYSQL_RUNNING=false
MYSQL_CONTAINER=""

# Check if system MariaDB/MySQL is running
if systemctl is-active --quiet mariadb 2>/dev/null || systemctl is-active --quiet mysql 2>/dev/null; then
    MYSQL_RUNNING=true
    print_status "System MariaDB/MySQL is running"
# Check for 1Panel Docker MySQL containers
elif sudo docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -q "3306"; then
    MYSQL_CONTAINER=$(sudo docker ps --format "table {{.Names}}\t{{.Ports}}" | grep "3306" | head -1 | awk '{print $1}')
    MYSQL_RUNNING=true
    print_status "Found 1Panel MySQL container: $MYSQL_CONTAINER"
fi

if [ "$MYSQL_RUNNING" = false ]; then
    print_status "Installing MariaDB..."
    sudo dnf install -y mariadb-server
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
    print_status "MariaDB installed and started"
else
    print_status "Using existing MySQL/MariaDB service"
fi

# Setup database
print_step "Setting up database..."

# Read existing database config from .env if it exists
if [ -f .env ]; then
    DB_NAME=$(grep "^DB_NAME=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
    DB_USER=$(grep "^DB_USER=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
fi

# Prompt for database credentials if not set
if [ -z "$DB_NAME" ]; then
    read -p "Enter database name: " DB_NAME
fi
if [ -z "$DB_USER" ]; then
    read -p "Enter database user: " DB_USER
fi
if [ -z "$DB_PASSWORD" ]; then
    read -p "Enter database password: " DB_PASSWORD
fi

if [ -n "$MYSQL_CONTAINER" ]; then
    print_status "Using 1Panel MySQL container: $MYSQL_CONTAINER"
    print_warning "⚠️  IMPORTANT: You must create the database and user manually in 1Panel"
    print_warning "1. Go to 1Panel Web UI (http://your-server-ip:9999)"
    print_warning "2. Navigate to 'Database' → 'MySQL'"
    print_warning "3. Create database: $DB_NAME"
    print_warning "4. Create user: $DB_USER with password: $DB_PASSWORD"
    print_warning "5. Grant ALL privileges on $DB_NAME to $DB_USER"
    print_warning "6. When creating the user, specify: IDENTIFIED WITH mysql_native_password BY '$DB_PASSWORD';"
    print_warning ""
    
    # Get the container IP for database connection
    CONTAINER_IP=$(sudo docker inspect $MYSQL_CONTAINER --format '{{.NetworkSettings.IPAddress}}')
    if [ -n "$CONTAINER_IP" ]; then
        DB_HOST=$MYSQL_CONTAINER  # Use container name for inter-container communication
        print_status "Using MySQL container name: $MYSQL_CONTAINER"
    else
        DB_HOST=$MYSQL_CONTAINER  # Still use container name even if IP not detected
        print_warning "Could not detect container IP, using container name: $MYSQL_CONTAINER"
    fi
    
    print_warning "The database host in .env will be set to: $DB_HOST"
    print_warning ""
    print_warning "Press Enter when you have created the database and user in 1Panel..."
    read -p ""
    
    # Skip automatic database creation for 1Panel containers
    print_status "Skipping automatic database setup for 1Panel container"
else
    # System MariaDB setup
    if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
        read -p "Enter MySQL root password: " -s MYSQL_ROOT_PASSWORD
        echo
    fi
    
    # Try to connect and setup database
    print_status "Connecting to database..."
    if sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -h 127.0.0.1 -P 3306 << EOF 2>/dev/null
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASSWORD';
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED WITH mysql_native_password BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;
EOF
    then
        print_status "Database setup completed successfully"
    else
        print_warning "Could not connect to database with provided credentials"
        print_warning "You may need to:"
        print_warning "1. Check MySQL root password"
        print_warning "2. Create database manually"
        print_warning "3. Update .env file with correct database credentials"
    fi
fi

# Setup environment file
print_step "Setting up environment configuration..."

# Read existing AMap key from .env if it exists
AMAP_KEY=""
if [ -f .env ]; then
    AMAP_KEY=$(grep "^VITE_AMAP_KEY=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
    print_status ".env file already exists, reading existing configuration..."
else
    print_status "Creating new .env file..."
    # Create basic .env file
    cat > .env << 'EOF'
DJANGO_SECRET_KEY=change-me-in-production
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DB_ENGINE=mysql
DB_NAME=activitypass
DB_USER=root
DB_PASSWORD=your-password-here
DB_HOST=127.0.0.1
DB_PORT=3306
CORS_ALLOW_ALL=true
VITE_AMAP_KEY=your-amap-key-here
DOMAIN_NAME=your-domain-here
EOF
fi

# Prompt for AMap API key if not found
if [ -z "$AMAP_KEY" ] || [ "$AMAP_KEY" = "your-amap-key-here" ]; then
    read -p "Enter AMap API key (leave empty to skip): " AMAP_KEY
fi

# Generate random secret key if not set
SECRET_KEY=$(grep "^DJANGO_SECRET_KEY=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "change-me-in-production" ]; then
    SECRET_KEY=$($PYTHON_CMD -c "import secrets; print(secrets.token_urlsafe(50))")
fi

# Update .env file with current values
sed -i "s/DB_NAME=.*/DB_NAME=$DB_NAME/" .env
sed -i "s/DB_USER=.*/DB_USER=$DB_USER/" .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
sed -i "s/DB_HOST=.*/DB_HOST=$DB_HOST/" .env
sed -i "s/DJANGO_SECRET_KEY=.*/DJANGO_SECRET_KEY=$SECRET_KEY/" .env
sed -i "s/DJANGO_DEBUG=.*/DJANGO_DEBUG=false/" .env

if [ -n "$AMAP_KEY" ]; then
    sed -i "s|VITE_AMAP_KEY=.*|VITE_AMAP_KEY=$AMAP_KEY|" .env
fi

# Update DOMAIN_NAME
sed -i "s/DOMAIN_NAME=.*/DOMAIN_NAME=$DOMAIN_NAME/" .env
if ! grep -q "^DOMAIN_NAME=" .env; then
    echo "DOMAIN_NAME=$DOMAIN_NAME" >> .env
fi

print_status "Environment configuration completed"

# Setup backend
print_step "Setting up Python backend..."
$PYTHON_CMD -m venv backend/.venv
source backend/.venv/bin/activate
# cp .env backend/.env  # Removed: use root .env like run_all.py
cd backend

# Upgrade pip with timeout and retry
print_status "Upgrading pip..."
for i in {1..3}; do
    if $PYTHON_CMD -m pip install --upgrade --timeout=60 --no-cache-dir pip; then
        break
    else
        print_warning "Pip upgrade attempt $i failed, retrying..."
        sleep 5
    fi
done

# Install requirements with timeout and retry (optimized for speed)
print_status "Installing Python requirements..."
for i in {1..3}; do
    if $PYTHON_CMD -m pip install --timeout=60 --no-cache-dir --only-binary=all -r requirements.txt; then
        break
    else
        print_warning "Requirements installation attempt $i failed, retrying..."
        sleep 5
    fi
done

print_status "Running database migrations..."
$PYTHON_CMD manage.py migrate

print_status "Creating superuser..."
$PYTHON_CMD manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser created')
else:
    print('Superuser already exists')
"

print_status "Collecting static files..."
$PYTHON_CMD manage.py collectstatic --noinput

cd ..

# Build frontend
print_step "Building React frontend..."
cd frontend
# Skip puppeteer browser download to avoid network timeouts
export PUPPETEER_SKIP_DOWNLOAD=true
npm install
npm run build
cd ..

# Deploy frontend to 1Panel sites directory
print_step "Deploying frontend to 1Panel sites directory..."
sudo cp -r frontend/build/* "$FRONTEND_DEPLOY_DIR/"
sudo chown -R www-data:www-data "$FRONTEND_DEPLOY_DIR" 2>/dev/null || sudo chown -R nginx:nginx "$FRONTEND_DEPLOY_DIR" 2>/dev/null || sudo chown -R $USER:$USER "$FRONTEND_DEPLOY_DIR"
sudo chmod -R 755 "$FRONTEND_DEPLOY_DIR"

# Setup manage.py in backend (assuming it exists)
print_step "Checking manage.py in backend..."
if [ ! -f backend/manage.py ]; then
    print_error "manage.py not found in backend/; please ensure it exists"
    exit 1
fi

chmod +x backend/manage.py 2>/dev/null || true

print_status "🎉 1Panel deployment completed!"
print_status ""
print_status "📁 Deployment Directories:"
print_status "   Backend: $DEPLOY_DIR/backend"
print_status "   Frontend: $FRONTEND_DEPLOY_DIR"
print_status ""
print_status "🔧 1Panel Configuration:"
print_status "1. Create a WEBSITE for the frontend:"
print_status "   - Go to 1Panel Web Interface (http://your-server-ip:9999)"
print_status "   - Navigate to 'Website' → 'Add Site' → 'Static'"
print_status "   - Configure:"
print_status "     - Group: Default"
print_status "     - Type: Nginx"
print_status "     - Primary domain: $ALIAS (or your actual domain)"
print_status "     - Alias: $ALIAS"
print_status "     - Root Directory: ${SITES_DIR}/${ALIAS} (1Panel will automatically serve from the index subdirectory)"
print_status ""
print_status "2. Create a RUNTIME APPLICATION for the backend:"
print_status "   - Go to 1Panel Web Interface (http://your-server-ip:9999)"
print_status "   - Navigate to 'App Store' → 'Local' → 'Runtime'"
print_status "   - Configure:"
print_status "     - Name: activitypass-backend"
print_status "     - Image: python:3.8 (or the version available in 1Panel)"
print_status "     - Port: 8000"
print_status "     - Root Directory: /www/wwwroot/activitypass/backend"
print_status "     - Startup Command: source .venv/bin/activate && pip install -r requirements.txt && python manage.py runserver 0.0.0.0:8000"
print_status ""
print_status "3. After creating the runtime application, edit its configuration:"
print_status "   - Add environment variables if needed"
print_status "   - The startup command should already be set correctly"
print_status ""
print_status "4. For the website, edit the Nginx configuration:"
print_status "   - Add this location block for SPA routing (before the root directive):"
print_status "     location / {"
print_status "         try_files \$uri \$uri/ /index.html;"
print_status "     }"
print_status "   - Update the API proxy location:"
print_status "     location /api/ {"
print_status "         proxy_pass http://activitypass-backend:8000;"
print_status "         proxy_set_header Host \$host;"
print_status "         proxy_set_header X-Real-IP \$remote_addr;"
print_status "         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
print_status "         proxy_set_header X-Forwarded-Proto \$scheme;"
print_status "     }"
print_status ""
print_status "📊 Access URLs:"
print_status "   Frontend: http://$ALIAS/"
print_status "   API: http://$ALIAS/api/"
print_status "   Admin: http://$ALIAS/admin/"
print_status ""
print_status "⚠️  Important: Change default admin password!"
print_status "   Username: admin"
print_status "   Password: admin123"