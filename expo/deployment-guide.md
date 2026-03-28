# Functional Wiehl Fitness Tracker - Hetzner Deployment Guide

## 1. Server-Vorbereitung

### Benötigte Software auf dem Hetzner Server:
```bash
# Node.js/Bun Installation
curl -fsSL https://bun.sh/install | bash

# PostgreSQL Installation
sudo apt update
sudo apt install postgresql postgresql-contrib

# Nginx für Reverse Proxy (optional)
sudo apt install nginx
```

## 2. Dateien übertragen

### Option A: Via SCP
```bash
# Von Ihrem lokalen Rechner aus (nachdem Sie fitness-app-deploy.tar.gz heruntergeladen haben):
scp fitness-app-deploy.tar.gz root@ihre-hetzner-ip:/var/www/
```

### Option B: Direkt auf dem Server herunterladen
```bash
# Auf dem Hetzner Server:
cd /var/www/
wget [Replit-Download-Link]
```

## 3. App auf dem Server einrichten

```bash
# Entpacken
cd /var/www/
tar -xzf fitness-app-deploy.tar.gz
cd fitness-app/

# Dependencies installieren
bun install

# Web Build erstellen (falls nicht vorhanden)
bunx expo export --platform web
```

## 4. PostgreSQL Datenbank einrichten

```sql
sudo -u postgres psql

CREATE DATABASE fitness_tracker;
CREATE USER fitness_user WITH PASSWORD 'sicheres_passwort';
GRANT ALL PRIVILEGES ON DATABASE fitness_tracker TO fitness_user;
\q
```

## 5. Umgebungsvariablen setzen

Erstellen Sie eine `.env` Datei:
```bash
nano .env
```

Inhalt:
```
DATABASE_URL=postgresql://fitness_user:sicheres_passwort@localhost:5432/fitness_tracker
JWT_SECRET=ihr_geheimes_jwt_token_hier
BACKEND_PORT=3000
CORS_ORIGIN=https://ihre-domain.de
API_BASE_URL=https://ihre-domain.de
EXPO_PUBLIC_RORK_API_BASE_URL=https://ihre-domain.de
```

## 6. Datenbank initialisieren

```bash
# Schema pushen
bun run db:push --force

# Trainer-Account erstellen (optional, falls noch nicht vorhanden)
```

## 7. Systemd Service einrichten

```bash
sudo nano /etc/systemd/system/fitness-app.service
```

Inhalt:
```ini
[Unit]
Description=Functional Wiehl Fitness Tracker
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/fitness-app
ExecStart=/home/www-data/.bun/bin/bun run backend-server.ts
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Service aktivieren:
```bash
sudo systemctl enable fitness-app
sudo systemctl start fitness-app
sudo systemctl status fitness-app
```

## 8. Nginx Reverse Proxy (optional)

```nginx
server {
    listen 80;
    server_name ihre-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 9. SSL mit Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ihre-domain.de
```

## Wichtige Hinweise:

1. **Trainer-Login**: app@functional-wiehl.de / trainer123
2. **Port**: Die App läuft standardmäßig auf Port 3000
3. **Logs**: `sudo journalctl -u fitness-app -f`
4. **Neustart**: `sudo systemctl restart fitness-app`

## Troubleshooting:

- **Datenbankverbindung**: Prüfen Sie DATABASE_URL in .env
- **Port bereits belegt**: Ändern Sie BACKEND_PORT in .env
- **CORS-Fehler**: Stellen Sie sicher, dass CORS_ORIGIN korrekt gesetzt ist