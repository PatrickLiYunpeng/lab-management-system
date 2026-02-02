# Alibaba Cloud ECS Deployment Guide

## Prerequisites
- Ubuntu 20.04/22.04 ECS instance
- Root or sudo access
- ECS Security Group allows ports 22, 80, 443

## Step 1: Transfer Project Files

From your local machine, transfer the project to your ECS:

```bash
# Replace YOUR_ECS_IP with your actual ECS public IP
rsync -avz --exclude 'node_modules' --exclude '.venv' --exclude '__pycache__' \
    --exclude '*.db' --exclude '.git' \
    /path/to/lab-management-system/ root@YOUR_ECS_IP:/opt/lab-management/
```

Or using scp:
```bash
scp -r lab-management-system root@YOUR_ECS_IP:/opt/lab-management
```

## Step 2: Server Setup

SSH into your ECS and run the setup script:

```bash
ssh root@YOUR_ECS_IP
cd /opt/lab-management
chmod +x scripts/deploy-setup.sh
./scripts/deploy-setup.sh
```

This script will:
- Install Docker and Docker Compose
- Configure UFW firewall (ports 22, 80, 443)
- Install fail2ban for security

## Step 3: Configure Environment

```bash
cd /opt/lab-management

# Copy and edit environment file
cp .env.example .env
nano .env
```

Update these values in `.env`:
```
SERVER_IP=your_ecs_public_ip
MYSQL_ROOT_PASSWORD=strong_random_password
MYSQL_PASSWORD=another_strong_password
SECRET_KEY=generate_using_python_secrets
```

Generate a secure SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Step 4: Build and Start Services

```bash
cd /opt/lab-management

# Build and start all containers
docker compose up -d --build

# Check container status
docker compose ps

# View logs
docker compose logs -f
```

## Step 5: Run Database Migrations

```bash
# Run migrations
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

## Step 6: Verify Deployment

```bash
# Check all services are running
docker compose ps

# Test API health endpoint
curl http://localhost/health

# Test API docs
curl http://localhost/docs
```

Access your application:
- Frontend: `http://YOUR_ECS_IP/`
- API Docs: `http://YOUR_ECS_IP/docs`
- Health Check: `http://YOUR_ECS_IP/health`

## Useful Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# Restart services
docker compose restart

# Stop all services
docker compose down

# Rebuild and restart
docker compose up -d --build

# Access backend container shell
docker compose exec backend bash

# Access MySQL
docker compose exec db mysql -u lab_user -p lab_management
```

## Troubleshooting

### Check container status
```bash
docker compose ps
docker compose logs backend
```

### Database connection issues
```bash
# Check if MySQL is ready
docker compose exec db mysqladmin ping -h localhost

# Check backend logs
docker compose logs backend | grep -i error
```

### Nginx issues
```bash
# Test nginx configuration
docker compose exec nginx nginx -t

# View nginx logs
docker compose logs nginx
```

## Security Recommendations

1. **Change default passwords** in `.env`
2. **Keep system updated**: `apt update && apt upgrade -y`
3. **Monitor fail2ban**: `fail2ban-client status`
4. **Regular backups**: Schedule MySQL backups
5. **Use strong SSH keys** and disable password authentication

## Backup Database

```bash
# Create backup
docker compose exec db mysqldump -u root -p lab_management > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup.sql | docker compose exec -T db mysql -u root -p lab_management
```
