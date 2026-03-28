#!/bin/bash

echo "🚀 Starting deployment process..."

# Stop existing PM2 process
echo "🛑 Stopping existing PM2 process..."
pm2 stop fitness-app 2>/dev/null || echo "No existing process to stop"
pm2 delete fitness-app 2>/dev/null || echo "No existing process to delete"

# Build web version
echo "📦 Building web version..."
bunx rork export -p web

# Copy web build to nginx directory
echo "📁 Copying web build to nginx directory..."
sudo rm -rf /var/www/fitness-app/dist
sudo mkdir -p /var/www/fitness-app
sudo cp -r web-build/ /var/www/fitness-app/dist/
sudo chown -R www-data:www-data /var/www/fitness-app
sudo chmod -R 755 /var/www/fitness-app

# Setup trainer account in database
echo "👤 Setting up trainer account..."
node setup-trainer.js

# Start server with PM2
echo "🚀 Starting server with PM2..."
pm2 start server.js --name fitness-app

# Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo "🌐 Web app: https://app.functional-wiehl.de"
echo "🔧 API: https://app.functional-wiehl.de/api"
echo "📊 PM2 status:"
pm2 status