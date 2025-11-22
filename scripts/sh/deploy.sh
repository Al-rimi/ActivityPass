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

# Determine the best deployment directory for 1Panel
if [ -d "/www/wwwroot" ]; then
    DEPLOY_DIR="/www/wwwroot/activitypass"
    print_status "Using 1Panel standard directory: $DEPLOY_DIR"
elif [ -d "/var/www" ]; then
    DEPLOY_DIR="/var/www/activitypass"
    print_status "Using standard web directory: $DEPLOY_DIR"
else
    DEPLOY_DIR="/opt/activitypass"
    print_warning "Using /opt/activitypass (1Panel may have limited access here)"
fi

# Create deployment directory
print_step "Creating deployment directory..."
sudo mkdir -p "$DEPLOY_DIR"
sudo chown -R $USER:$USER "$DEPLOY_DIR"

# Clone repository
print_step "Cloning repository..."
cd "$DEPLOY_DIR"
if [ ! -d ".git" ]; then
    git clone https://github.com/Al-rimi/ActivityPass.git .
else
    print_status "Repository already exists, pulling latest changes..."
    git pull origin main
fi

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

if [ -n "$MYSQL_CONTAINER" ]; then
    print_status "Using 1Panel MySQL container: $MYSQL_CONTAINER"
    print_warning "Please ensure the MySQL container has the required database and user created"
    print_warning "You may need to configure the database manually in 1Panel"
    print_status "1Panel MySQL containers typically use these default credentials:"
    print_status "  - Root Password: empty or '1panel'"
    print_status "  - Access via: 1Panel Web UI → Database → MySQL"
    
    # For 1Panel containers, try common default passwords or prompt user
    MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-""}
    if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
        print_warning "1Panel MySQL containers often use default credentials"
        read -p "Enter MySQL root password (default for 1Panel containers is often empty or '1panel'): " -s MYSQL_ROOT_PASSWORD
        MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-"1panel"}
    fi
else
    # System MariaDB setup
    if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
        read -p "Enter MySQL root password: " -s MYSQL_ROOT_PASSWORD
        echo
    fi
fi

read -p "Enter database name [activitypass]: " DB_NAME
DB_NAME=${DB_NAME:-activitypass}
read -p "Enter database user [activitypass]: " DB_USER
DB_USER=${DB_USER:-activitypass}
read -p "Enter database password: " -s DB_PASSWORD
echo

# Try to connect and setup database
print_status "Connecting to database..."
if sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -h 127.0.0.1 -P 3306 << EOF 2>/dev/null
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';
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
    print_warning "2. Create database manually in 1Panel"
    print_warning "3. Update .env file with correct database credentials"
fi

# Setup environment file
print_step "Setting up environment configuration..."

if [ -f .env ]; then
    print_status ".env file already exists, backing up..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy from example if it exists
if [ -f .env.example ]; then
    cp .env.example .env
else
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
EOF
fi

# Prompt for AMap API key
read -p "Enter AMap API key (leave empty to skip): " AMAP_KEY

# Generate random secret key
SECRET_KEY=$($PYTHON_CMD -c "import secrets; print(secrets.token_urlsafe(50))")

# Update .env file
sed -i "s/DB_NAME=.*/DB_NAME=$DB_NAME/" .env
sed -i "s/DB_USER=.*/DB_USER=$DB_USER/" .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
sed -i "s/DJANGO_SECRET_KEY=.*/DJANGO_SECRET_KEY=$SECRET_KEY/" .env
sed -i "s/DJANGO_DEBUG=.*/DJANGO_DEBUG=false/" .env

if [ -n "$AMAP_KEY" ]; then
    sed -i "s|VITE_AMAP_KEY=.*|VITE_AMAP_KEY=$AMAP_KEY|" .env
fi

print_status "Environment configuration completed"

# Setup backend
print_step "Setting up Python backend..."
cd backend
$PYTHON_CMD -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

print_status "Running database migrations..."
python manage.py migrate

print_status "Creating superuser..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@example.com', 'admin123')" | python manage.py shell

print_status "Collecting static files..."
python manage.py collectstatic --noinput

cd ..

# Build frontend
print_step "Building React frontend..."
cd frontend
npm install
npm run build
cd ..

# Create 1Panel-compatible directory structure
print_step "Setting up 1Panel-compatible structure..."

# Create public directory for 1Panel (if using /www/wwwroot)
if [[ "$DEPLOY_DIR" == /www/wwwroot/* ]]; then
    PUBLIC_DIR="${DEPLOY_DIR}/public"
    sudo mkdir -p "$PUBLIC_DIR"

    # Copy frontend build to public directory
    cp -r frontend/build/* "$PUBLIC_DIR/"

    # Create symbolic links for backend static files
    ln -sf "$DEPLOY_DIR/backend/static" "$PUBLIC_DIR/static"
    ln -sf "$DEPLOY_DIR/backend/media" "$PUBLIC_DIR/media"
else
    PUBLIC_DIR="$DEPLOY_DIR/frontend/build"
fi

# Set proper permissions for 1Panel
print_step "Setting permissions for 1Panel..."
sudo chown -R www-data:www-data "$DEPLOY_DIR" 2>/dev/null || sudo chown -R nginx:nginx "$DEPLOY_DIR" 2>/dev/null || sudo chown -R $USER:$USER "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"

# Create a simple startup script for 1Panel
print_step "Creating 1Panel startup script..."
cat > start.sh << EOF
#!/bin/bash
# ActivityPass startup script for 1Panel

cd $DEPLOY_DIR/backend
source .venv/bin/activate
exec python manage.py runserver 127.0.0.1:8000
EOF

chmod +x start.sh

# Create a stop script
cat > stop.sh << EOF
#!/bin/bash
# ActivityPass stop script for 1Panel

pkill -f "manage.py runserver"
EOF

chmod +x stop.sh

# Create a health check script
cat > health.sh << EOF
#!/bin/bash
# ActivityPass health check for 1Panel

# Check if Django is running
if pgrep -f "manage.py runserver" > /dev/null; then
    echo "healthy"
    exit 0
else
    echo "unhealthy"
    exit 1
fi
EOF

chmod +x health.sh

print_status "🎉 1Panel deployment completed!"
print_status ""
print_status "📁 Deployment Directory: $DEPLOY_DIR"
print_status "🌐 Public Directory: $PUBLIC_DIR"
print_status ""
print_status "🔧 1Panel Configuration:"
print_status "1. Go to 1Panel Web Interface (http://your-server-ip:9999)"
print_status "2. Navigate to 'Website' → 'Add Site'"
print_status "3. Configure:"
print_status "   - Domain: your-domain.com"
print_status "   - Root Directory: $PUBLIC_DIR"
print_status "   - Type: Reverse Proxy"
print_status "   - Proxy Address: http://127.0.0.1:8000 (for API)"
print_status ""
print_status "🚀 Manual Start Commands:"
print_status "   cd $DEPLOY_DIR && ./start.sh    # Start backend"
print_status "   cd $DEPLOY_DIR && ./stop.sh     # Stop backend"
print_status "   cd $DEPLOY_DIR && ./health.sh   # Health check"
print_status ""
print_status "📊 Access URLs:"
print_status "   Frontend: http://your-server-ip/"
print_status "   API: http://your-server-ip/api/"
print_status "   Admin: http://your-server-ip/admin/"
print_status ""
print_status "⚠️  Important: Change default admin password!"
print_status "   Username: admin"
print_status "   Password: admin123"