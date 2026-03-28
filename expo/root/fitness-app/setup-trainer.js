require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function setupTrainer() {
  console.log('🔄 Connecting to database...');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is missing. Set it in .env like:');
    console.error('   DATABASE_URL=postgres://app_user:YOUR_PASSWORD@localhost:5432/fitness_app');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'trainer',
        name VARCHAR(255) NOT NULL,
        password_changed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const seedEmailNew = 'trainer@functional-wiehl.de';
    const seedEmailOld = 'trainer123';
    const seedPasswordPlain = 'trainer123';
    const salt = await bcrypt.genSalt(10);
    const seedPasswordHash = await bcrypt.hash(seedPasswordPlain, salt);

    const existingNew = await pool.query('SELECT id FROM users WHERE email = $1', [seedEmailNew]);
    const existingOld = await pool.query('SELECT id FROM users WHERE email = $1', [seedEmailOld]);

    if (existingNew.rows.length > 0) {
      await pool.query(
        'UPDATE users SET password = $1, name = $2, role = $3 WHERE email = $4',
        [seedPasswordHash, 'Trainer', 'trainer', seedEmailNew]
      );
      console.log('✅ Trainer updated successfully (new email).');
    } else if (existingOld.rows.length > 0) {
      await pool.query(
        'UPDATE users SET email = $1, password = $2, name = $3, role = $4 WHERE id = $5',
        [seedEmailNew, seedPasswordHash, 'Trainer', 'trainer', existingOld.rows[0].id]
      );
      console.log('✅ Trainer migrated from old username to email and updated.');
    } else {
      await pool.query(
        'INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4)',
        [seedEmailNew, seedPasswordHash, 'trainer', 'Trainer']
      );
      console.log('✅ Trainer created successfully!');
    }

    console.log('📋 Login credentials:');
    console.log('Email: ' + seedEmailNew);
    console.log('Password: ' + seedPasswordPlain);
  } catch (error) {
    console.error('❌ Error setting up trainer:', error);
  } finally {
    await pool.end();
  }
}

setupTrainer();