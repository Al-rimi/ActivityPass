#!/bin/bash

# ActivityPass 1Panel-Optimized Deployment Script
# This script deploys ActivityPass in a way that's fully manageable by 1Panel

set -e  # Exit on any error

echo "ActivityPass 1Panel Deployment"

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

# Check and upgrade Python version if necessary (not needed for Docker deployment)
print_step "Skipping Python version check (using Docker container)..."

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
sed -i "s/DB_HOST=.*/DB_HOST=127.0.0.1/" .env  # Use localhost for host migrations
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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is required for containerized deployment. Please install Docker first."
    exit 1
fi

# Build backend Docker image
print_step "Building backend Docker image..."
docker build -f Dockerfile.backend -t activitypass-backend:latest .

print_status "Backend Docker image built successfully"

# Now update .env to use container name for runtime
sed -i "s/DB_HOST=.*/DB_HOST=$MYSQL_CONTAINER/" .env

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

print_status "Deployment Directories:"
print_status "   Backend: $DEPLOY_DIR/backend"
print_status "   Frontend: $FRONTEND_DEPLOY_DIR"
print_status ""
print_status "Configure 1Panel Runtime:"
print_status "     - Name: activitypass"
print_status "     - Image: activitypass-backend:latest"
print_status "     - Port: 8000"
print_status "     - Root Directory: /www/wwwroot/activitypass/backend"
print_status "     - Startup Command: (leave default, handled by Dockerfile CMD)"
print_status "   - Set the following environment variables in 1Panel runtime:"
print_status "     - DB_ENGINE=mysql"
print_status "     - DB_NAME=$DB_NAME"
print_status "     - DB_USER=$DB_USER"
print_status "     - DB_PASSWORD=$DB_PASSWORD"
print_status "     - DB_HOST=$MYSQL_CONTAINER"
print_status "     - DB_PORT=3306"
print_status "     - DJANGO_DEBUG=false"
print_status "     - DJANGO_SECRET_KEY=$SECRET_KEY"
print_status "     - DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,$DOMAIN_NAME"
print_status ""
print_status "Nginx configuration:"
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