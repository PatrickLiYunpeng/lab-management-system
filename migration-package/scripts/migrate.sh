#!/bin/bash
# ===========================================
# Database Migration Script
# Run this after the containers are up
# ===========================================

set -e

echo "Running database migrations..."

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run migrations inside the backend container
docker compose exec -T backend alembic upgrade head

echo "Migrations completed successfully!"

# Optional: Seed initial data
read -p "Do you want to seed initial data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding initial data..."
    docker compose exec -T backend python -m scripts.seed_data
    echo "Data seeding completed!"
fi
