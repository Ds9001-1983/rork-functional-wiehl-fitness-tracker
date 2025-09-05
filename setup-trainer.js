require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function setupTrainer() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Connecting to database...');
    
    // Check if trainer already exists
    const existingTrainer = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['app@functional-wiehl.de']
    );

    if (existingTrainer.rows.length > 0) {
      console.log('✅ Trainer already exists in database');
      console.log('📧 Email:', existingTrainer.rows[0].email);
      console.log('👤 Role:', existingTrainer.rows[0].role);
      return;
    }

    // Create trainer account
    const hashedPassword = await bcrypt.hash('trainer123', 10);
    
    const result = await pool.query(
      `INSERT INTO users (email, password, role, password_changed, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) 
       RETURNING *`,
      ['app@functional-wiehl.de', hashedPassword, 'trainer', true]
    );

    console.log('✅ Trainer account created successfully!');
    console.log('📧 Email: app@functional-wiehl.de');
    console.log('🔑 Password: trainer123');
    console.log('👤 Role: trainer');
    console.log('🆔 ID:', result.rows[0].id);

  } catch (error) {
    console.error('❌ Error setting up trainer:', error);
  } finally {
    await pool.end();
  }
}

setupTrainer();