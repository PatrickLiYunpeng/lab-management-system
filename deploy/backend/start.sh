#!/bin/bash

# Lab Management System - Backend Startup Script

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it:"
    echo "  cp .env.example .env"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run database migrations (if using alembic)
# alembic upgrade head

# Start the server
echo "Starting backend server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000
