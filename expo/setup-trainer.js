require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function setupTrainer() {
  if (!process.env.DATABASE_URL || !process.env.TRAINER_PASSWORD) {
    console.error('Bitte DATABASE_URL und TRAINER_PASSWORD als Env-Variablen setzen.');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Connecting to database...');
    console.log('🔄 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Create tables if they don't exist
    console.log('🔄 Creating tables if they don\'t exist...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'client',
        password_changed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_workouts INTEGER DEFAULT 0,
        total_volume INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        personal_records JSONB DEFAULT '{}'
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        code VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tables created/verified successfully');
    
    // Check if trainer already exists
    const existingTrainer = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['app@functional-wiehl.de']
    );

    if (existingTrainer.rows.length > 0) {
      console.log('✅ Trainer already exists in database');
      console.log('📧 Email:', existingTrainer.rows[0].email);
      console.log('👤 Role:', existingTrainer.rows[0].role);
      console.log('🔑 Password changed:', existingTrainer.rows[0].password_changed);
      
      // Update password to ensure it's correct
      console.log('🔄 Updating trainer password to ensure it\'s correct...');
      const hashedPassword = await bcrypt.hash(process.env.TRAINER_PASSWORD, 10);
      
      await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2',
        [hashedPassword, 'app@functional-wiehl.de']
      );
      
      console.log('✅ Trainer password updated successfully!');
      return;
    }

    // Create trainer account
    console.log('🔄 Creating new trainer account...');
    const hashedPassword = await bcrypt.hash(process.env.TRAINER_PASSWORD, 10);
    
    const result = await pool.query(
      `INSERT INTO users (email, password, role, password_changed, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) 
       RETURNING *`,
      ['app@functional-wiehl.de', hashedPassword, 'trainer', true]
    );

    console.log('✅ Trainer account created successfully!');
    console.log('📧 Email: app@functional-wiehl.de');
    console.log('🔑 Password: (aus TRAINER_PASSWORD)');
    console.log('👤 Role: trainer');
    console.log('🆔 ID:', result.rows[0].id);

    // Verify the password works
    console.log('🔄 Verifying password...');
    const isValid = await bcrypt.compare(process.env.TRAINER_PASSWORD, result.rows[0].password);
    console.log('✅ Password verification:', isValid ? 'SUCCESS' : 'FAILED');

  } catch (error) {
    console.error('❌ Error setting up trainer:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
  } finally {
    await pool.end();
  }
}

setupTrainer();