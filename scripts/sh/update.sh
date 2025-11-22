#!/bin/bash

# ActivityPass Update Script
# This script updates the application from git and redeploys

set -e  # Exit on any error

echo "🔄 Starting ActivityPass update..."

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

# Function to backup current .env file
backup_env() {
    if [ -f .env ]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        print_status "Backed up current .env file"
    fi
}

# Function to restore .env file after git pull
restore_env() {
    if [ -f .env.backup.* ]; then
        # Get the most recent backup
        LATEST_BACKUP=$(ls -t .env.backup.* | head -1)
        cp "$LATEST_BACKUP" .env
        print_status "Restored .env file from backup"
    fi
}

# Function to update .env file with new variables if needed
update_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found, creating from .env.example"
        cp .env.example .env

        # Prompt for required configuration
        print_step "Configuring database settings..."

        read -p "Enter MySQL username [root]: " DB_USER
        DB_USER=${DB_USER:-root}

        read -s -p "Enter MySQL password: " DB_PASSWORD
        echo

        if [ -z "$DB_PASSWORD" ]; then
            print_error "MySQL password is required"
            exit 1
        fi

        read -p "Enter database name [activitypass]: " DB_NAME
        DB_NAME=${DB_NAME:-activitypass}

        read -p "Enter AMap API key [leave empty to skip]: " AMAP_KEY

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
    else
        print_status ".env file exists, checking for updates..."

        # Check if new variables need to be added from .env.example
        if [ -f .env.example ]; then
            # Add any missing variables from .env.example
            while IFS='=' read -r key value; do
                # Skip comments and empty lines
                [[ $key =~ ^[[:space:]]*# ]] && continue
                [[ -z $key ]] && continue

                # Check if key exists in current .env
                if ! grep -q "^${key}=" .env; then
                    echo "${key}=${value}" >> .env
                    print_status "Added missing variable: $key"
                fi
            done < .env.example
        fi
    fi
}

# Function to update backend
update_backend() {
    print_step "Updating backend..."

    cd backend

    # Activate virtual environment
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    else
        print_error "Virtual environment not found. Please run initial deployment first."
        exit 1
    fi

    # Update Python dependencies
    if [ -f "requirements.txt" ]; then
        print_status "Updating Python dependencies..."
        pip install -r requirements.txt
    fi

    # Run migrations
    print_status "Running database migrations..."
    python manage.py migrate

    # Collect static files
    print_status "Collecting static files..."
    python manage.py collectstatic --noinput --clear

    cd ..
}

# Function to update frontend
update_frontend() {
    print_step "Updating frontend..."

    cd frontend

    # Update npm dependencies
    if [ -f "package.json" ]; then
        print_status "Updating npm dependencies..."
        npm install
    fi

    # Build frontend
    print_status "Building frontend..."
    npm run build

    cd ..
}

# Function to restart services
restart_services() {
    print_step "Restarting services..."

    # Restart Django backend
    sudo systemctl restart activitypass 2>/dev/null || print_warning "Could not restart activitypass service (may not exist yet)"

    # Reload Nginx
    sudo systemctl reload nginx 2>/dev/null || print_warning "Could not reload nginx (may not be configured yet)"

    print_status "Services restarted"
}

# Main update process
main() {
    print_step "Starting update process..."

    # Backup current .env
    backup_env

    # Git pull
    print_step "Pulling latest changes from git..."
    if git pull origin main; then
        print_status "Git pull completed successfully"
    else
        print_error "Git pull failed"
        exit 1
    fi

    # Update .env file
    update_env_file

    # Update backend
    update_backend

    # Update frontend
    update_frontend

    # Restart services
    restart_services

    # Clean up old backups (keep last 5)
    if ls .env.backup.* 1> /dev/null 2>&1; then
        ls -t .env.backup.* | tail -n +6 | xargs rm -f 2>/dev/null || true
    fi

    print_status "🎉 Update completed successfully!"
    print_status ""
    print_status "Your ActivityPass application has been updated to the latest version."
    print_status "Check the application at: http://your-server-ip/"
}

# Check if this is an initial deployment or update
if [ ! -d ".git" ]; then
    print_error "This is not a git repository. Please run the initial deployment script first."
    exit 1
fi

# Run main update process
main