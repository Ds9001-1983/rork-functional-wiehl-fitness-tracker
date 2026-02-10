#!/bin/bash
set -e

# ============================================
# Functional Wiehl Fitness App - Server Setup
# Fuer frischen Ubuntu 24.04 VPS (Hetzner)
# ============================================

DOMAIN="app.functional-wiehl.de"
APP_DIR="/var/www/fitness-app"
DB_NAME="fitness_app"
DB_USER="app_user"
DB_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 48)

echo "============================================"
echo "  Functional Wiehl - Server Setup"
echo "  Server: $(hostname) ($(curl -s ifconfig.me))"
echo "============================================"
echo ""

# Step 1: System Update
echo "[1/8] System aktualisieren..."
apt update && apt upgrade -y
apt install -y curl wget git unzip software-properties-common

# Step 2: Install Bun
echo "[2/8] Bun installieren..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    # Add to .bashrc for persistence
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
    echo "  Bun $(bun --version) installiert"
else
    echo "  Bun $(bun --version) bereits vorhanden"
fi

# Step 3: Install PostgreSQL
echo "[3/8] PostgreSQL installieren..."
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    echo "  PostgreSQL installiert und gestartet"
else
    echo "  PostgreSQL bereits vorhanden"
fi

# Create database and user
echo "  Datenbank und Benutzer erstellen..."
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres createdb ${DB_NAME} -O ${DB_USER}
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
echo "  DB: ${DB_NAME}, User: ${DB_USER}"

# Step 4: Install Nginx
echo "[4/8] Nginx installieren..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# Step 5: Install PM2
echo "[5/8] PM2 installieren..."
if ! command -v pm2 &> /dev/null; then
    bun add -g pm2
    echo "  PM2 installiert"
else
    echo "  PM2 bereits vorhanden"
fi

# Step 6: Install Certbot (SSL)
echo "[6/8] Certbot installieren..."
apt install -y certbot python3-certbot-nginx

# Step 7: Clone and setup app
echo "[7/8] App einrichten..."
mkdir -p ${APP_DIR}

if [ -d "${APP_DIR}/.git" ]; then
    echo "  Git-Repo bereits vorhanden, pull..."
    cd ${APP_DIR}
    git pull
else
    echo "  HINWEIS: Bitte Repository manuell klonen:"
    echo "    cd ${APP_DIR}"
    echo "    git clone <REPO_URL> ."
    echo ""
    echo "  Oder Code per scp kopieren:"
    echo "    scp -r ./* root@$(curl -s ifconfig.me):${APP_DIR}/"
fi

# Create .env file
echo "  .env Datei erstellen..."
cat > ${APP_DIR}/.env << ENVEOF
NODE_ENV=production
BACKEND_PORT=3000

# PostgreSQL Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
PGHOST=localhost
PGPORT=5432
PGUSER=${DB_USER}
PGPASSWORD=${DB_PASS}
PGDATABASE=${DB_NAME}

# Security
JWT_SECRET=${JWT_SECRET}

# URLs
CORS_ORIGIN=https://${DOMAIN}
API_BASE_URL=https://${DOMAIN}/api
EXPO_PUBLIC_RORK_API_BASE_URL=https://${DOMAIN}
ENVEOF

chmod 600 ${APP_DIR}/.env
echo "  .env erstellt (Zugangsdaten gesichert)"

# Step 8: Nginx config
echo "[8/8] Nginx konfigurieren..."
cat > /etc/nginx/sites-available/fitness-app << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check proxy
    location /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Static files (Expo web build)
    location / {
        root /var/www/fitness-app/dist;
        try_files \$uri \$uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 256;

    client_max_body_size 10M;
}
NGINXEOF

# Enable site
ln -sf /etc/nginx/sites-available/fitness-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t
systemctl reload nginx

# Setup firewall
echo "  Firewall konfigurieren..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

echo ""
echo "============================================"
echo "  Setup abgeschlossen!"
echo "============================================"
echo ""
echo "  Server-IP:     $(curl -s ifconfig.me)"
echo "  Domain:        ${DOMAIN}"
echo "  App-Verzeichnis: ${APP_DIR}"
echo ""
echo "  Datenbank:"
echo "    Name:     ${DB_NAME}"
echo "    User:     ${DB_USER}"
echo "    Passwort: ${DB_PASS}"
echo ""
echo "  JWT Secret: ${JWT_SECRET}"
echo ""
echo "  WICHTIG: Diese Zugangsdaten sind in ${APP_DIR}/.env gespeichert!"
echo "  WICHTIG: Notiere dir das DB-Passwort sicher!"
echo ""
echo "  Naechste Schritte:"
echo "  1. DNS: A-Record fuer ${DOMAIN} -> $(curl -s ifconfig.me)"
echo "  2. Code auf den Server kopieren (falls nicht per git clone):"
echo "     scp -r ./* root@$(curl -s ifconfig.me):${APP_DIR}/"
echo "  3. Auf dem Server: cd ${APP_DIR} && bash deploy.sh"
echo "  4. SSL: certbot --nginx -d ${DOMAIN}"
echo ""
