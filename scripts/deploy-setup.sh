#!/bin/bash
# ===========================================
# Lab Management System - Deployment Script
# ===========================================
# Run this script on your Alibaba Cloud ECS

set -e

echo "=========================================="
echo "Lab Management System Deployment"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root or with sudo"
    exit 1
fi

# Function to install Docker
install_docker() {
    echo "Installing Docker..."
    apt-get update
    apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start Docker
    systemctl start docker
    systemctl enable docker
    
    echo "Docker installed successfully!"
}

# Function to configure firewall
configure_firewall() {
    echo "Configuring firewall..."
    
    # Install ufw if not present
    apt-get install -y ufw
    
    # Allow SSH, HTTP, HTTPS
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Enable firewall
    ufw --force enable
    
    echo "Firewall configured!"
}

# Function to install fail2ban
install_fail2ban() {
    echo "Installing fail2ban..."
    apt-get install -y fail2ban
    
    # Create jail configuration
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
EOF
    
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    echo "fail2ban installed and configured!"
}

# Main installation
main() {
    echo "Starting installation..."
    
    # Update system
    apt-get update && apt-get upgrade -y
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        install_docker
    else
        echo "Docker already installed"
    fi
    
    # Configure firewall
    configure_firewall
    
    # Install fail2ban
    install_fail2ban
    
    # Create application directory
    APP_DIR="/opt/lab-management"
    mkdir -p $APP_DIR
    
    echo ""
    echo "=========================================="
    echo "System setup complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Copy your project files to $APP_DIR"
    echo "2. Copy .env.example to .env and update values"
    echo "3. Run: cd $APP_DIR && docker compose up -d"
    echo ""
}

# Run main
main "$@"
