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

# Install MySQL/MariaDB
if ! systemctl is-active --quiet mariadb; then
    print_status "Installing MariaDB..."
    sudo dnf install -y mariadb-server
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
    print_status "MariaDB installed and started"
else
    print_status "MariaDB already running"
fi

# Setup database
print_step "Setting up database..."
read -p "Enter MySQL root password: " -s MYSQL_ROOT_PASSWORD
echo
read -p "Enter database name [activitypass]: " DB_NAME
DB_NAME=${DB_NAME:-activitypass}
read -p "Enter database user [activitypass]: " DB_USER
DB_USER=${DB_USER:-activitypass}
read -p "Enter database password: " -s DB_PASSWORD
echo

sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

print_status "Database setup completed"

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
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")

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
python3 -m venv .venv
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