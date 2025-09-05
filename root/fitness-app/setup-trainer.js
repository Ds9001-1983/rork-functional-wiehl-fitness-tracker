require('dotenv').config();
const { Pool } = require('pg');

async function setupTrainer() {
  console.log('🔄 Connecting to database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'trainer',
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if trainer already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['trainer123']
    );

    if (existingUser.rows.length > 0) {
      // Update existing trainer
      await pool.query(
        'UPDATE users SET password = $1, name = $2 WHERE email = $3',
        ['trainer123', 'Trainer', 'trainer123']
      );
      console.log('✅ Trainer updated successfully!');
    } else {
      // Create new trainer
      await pool.query(
        'INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4)',
        ['trainer123', 'trainer123', 'trainer', 'Trainer']
      );
      console.log('✅ Trainer created successfully!');
    }

    console.log('📋 Login credentials:');
    console.log('Username: trainer123');
    console.log('Password: trainer123');
    
  } catch (error) {
    console.error('❌ Error setting up trainer:', error);
  } finally {
    await pool.end();
  }
}

setupTrainer();