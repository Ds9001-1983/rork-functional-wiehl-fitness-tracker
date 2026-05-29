const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testLogin() {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', ['app@functional-wiehl.de']);
  const user = result.rows[0];

  console.log('User gefunden:', !!user);
  console.log('Passwort-Hash:', user?.password);

  const testPassword = process.env.TEST_PASSWORD || '';
  const isValid = await bcrypt.compare(testPassword, user.password);
  console.log('Passwort gültig:', isValid);
  
  await pool.end();
}

testLogin();
