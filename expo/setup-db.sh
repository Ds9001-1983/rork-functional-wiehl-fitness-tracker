#!/bin/bash

# Database setup script for fitness app
echo "🗄️  Setting up PostgreSQL database..."

# Generate a strong password (you can use the existing one)
DBPASS="LKW_Peter123!"
DBUSER="app_user"
DBNAME="fitness_app"

echo "📝 Creating database user and database..."

# Create user and database
sudo -u postgres psql <<EOF
-- Create user if not exists
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DBUSER') THEN
      CREATE ROLE $DBUSER LOGIN PASSWORD '$DBPASS';
   END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DBNAME OWNER $DBUSER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DBNAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DBNAME TO $DBUSER;
EOF

echo "✅ Database setup completed!"
echo "📋 Connection details:"
echo "   Database: $DBNAME"
echo "   User: $DBUSER"
echo "   Connection string: postgresql://$DBUSER:$DBPASS@localhost:5432/$DBNAME"