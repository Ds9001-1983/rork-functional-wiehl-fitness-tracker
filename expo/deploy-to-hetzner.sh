#!/bin/bash

# Fitness App Hetzner Deployment Script
# Führen Sie dieses Script auf Ihrem Hetzner Server aus

set -e  # Bei Fehler stoppen

echo "🚀 Starting Fitness App Deployment..."

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funktion für farbige Ausgabe
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
log_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }

# 1. Prüfen ob web-build existiert
log_info "Checking web-build directory..."
if [ ! -d "/var/www/fitness-app/web-build" ]; then
    log_info "Creating web build..."
    cd /var/www/fitness-app
    bunx expo export --platform web
    log_success "Web build created"
else
    log_success "Web build exists"
fi

# 2. PostgreSQL Berechtigungen setzen
log_info "Setting database permissions..."
sudo -u postgres psql <<EOF
\c fitness_app
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;
EOF
log_success "Database permissions set"

# 3. .env Datei korrigieren
log_info "Updating .env file..."
cat > /var/www/fitness-app/.env <<'EOF'
NODE_ENV=production
BACKEND_PORT=3000
DATABASE_URL=postgresql://app_user:LKW_Peter123@localhost:5432/fitness_app
JWT_SECRET=aN8hS3kZrPq!xY9mWt7sKuF2LgJeD4b
CORS_ORIGIN=https://app.functional-wiehl.de
API_BASE_URL=https://app.functional-wiehl.de
EXPO_PUBLIC_RORK_API_BASE_URL=https://app.functional-wiehl.de
PGHOST=localhost
PGPORT=5432
PGUSER=app_user
PGPASSWORD=LKW_Peter123
PGDATABASE=fitness_app
EOF
log_success ".env file updated"

# 4. Nginx Konfiguration erstellen
log_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/fitness-app <<'EOF'
server {
    listen 80;
    server_name app.functional-wiehl.de;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.functional-wiehl.de;

    ssl_certificate     /etc/letsencrypt/live/app.functional-wiehl.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.functional-wiehl.de/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/fitness-app/web-build;
    index index.html;

    # API → Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 86400;
    }

    # Healthcheck
    location = /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
        
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
}
EOF

# Nginx aktivieren
ln -sf /etc/nginx/sites-available/fitness-app /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
log_success "Nginx configured"

# 5. Systemd Service korrigieren
log_info "Updating systemd service..."
cat > /etc/systemd/system/fitness-app.service <<'EOF'
[Unit]
Description=Functional Wiehl Fitness Tracker
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/fitness-app
ExecStart=/root/.bun/bin/bun run backend-server.ts
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
log_success "Systemd service updated"

# 6. Service neu starten
log_info "Restarting service..."
systemctl restart fitness-app
sleep 3

# 7. Status prüfen
if systemctl is-active --quiet fitness-app; then
    log_success "Service is running!"
    
    # Test endpoints
    log_info "Testing endpoints..."
    
    if curl -s http://localhost:3000/health | grep -q "ok"; then
        log_success "Backend health check: OK"
    else
        log_error "Backend health check failed"
    fi
    
    if curl -s https://app.functional-wiehl.de/health | grep -q "ok"; then
        log_success "HTTPS health check: OK"
    else
        log_info "HTTPS not reachable yet (DNS might need time)"
    fi
    
    echo ""
    log_success "🎉 Deployment complete!"
    echo ""
    echo "📱 Your app is available at: https://app.functional-wiehl.de"
    echo "🔑 Trainer login: app@functional-wiehl.de / trainer123"
    echo ""
    echo "📊 Check logs with: journalctl -u fitness-app -f"
else
    log_error "Service failed to start. Check logs: journalctl -u fitness-app -n 50"
fi