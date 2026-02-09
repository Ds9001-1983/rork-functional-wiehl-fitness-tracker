#!/bin/bash
set -e

echo "=== Functional Wiehl Fitness App Deployment ==="
echo ""

# Check prerequisites
if ! command -v bun &> /dev/null; then
    echo "ERROR: bun is not installed. Install with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

if ! command -v pm2 &> /dev/null; then
    echo "ERROR: pm2 is not installed. Install with: bun add -g pm2"
    exit 1
fi

# Check .env file
if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Copy .env.example to .env and fill in values."
    exit 1
fi

# Load environment
source .env

# Stop existing PM2 process
echo "[1/7] Stopping existing services..."
pm2 stop fitness-api 2>/dev/null || echo "  No existing process to stop"
pm2 delete fitness-api 2>/dev/null || echo "  No existing process to delete"

# Install dependencies
echo "[2/7] Installing dependencies..."
bun install --production

# Run tests
echo "[3/7] Running tests..."
bun test __tests__/ || echo "  Warning: Some tests failed"

# Build web version
echo "[4/7] Building web version..."
bunx expo export --platform web

# Copy web build to nginx directory
echo "[5/7] Deploying static files..."
sudo rm -rf /var/www/fitness-app/dist
sudo mkdir -p /var/www/fitness-app
sudo cp -r web-build/ /var/www/fitness-app/dist/
sudo chown -R www-data:www-data /var/www/fitness-app
sudo chmod -R 755 /var/www/fitness-app

# Setup logs directory
mkdir -p logs

# Start server with PM2
echo "[6/7] Starting API server..."
pm2 start ecosystem.config.js

# Reload nginx
echo "[7/7] Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "=== Deployment complete ==="
echo "Web app:  https://app.functional-wiehl.de"
echo "API:      https://app.functional-wiehl.de/api"
echo "Health:   https://app.functional-wiehl.de/health"
echo ""
pm2 status
