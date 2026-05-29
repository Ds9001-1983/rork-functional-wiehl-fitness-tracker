require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function fixPassword() {
  if (!process.env.DATABASE_URL || !process.env.NEW_PASSWORD) {
    console.error('Bitte DATABASE_URL und NEW_PASSWORD als Env-Variablen setzen.');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Neuen Hash mit lokalem bcrypt generieren
  const newHash = await bcrypt.hash(process.env.NEW_PASSWORD, 10);
  console.log('Neuer Hash generiert:', newHash);
  
  // In DB updaten
  const result = await pool.query(
    'UPDATE users SET password = $1 WHERE email = $2 RETURNING *',
    [newHash, 'app@functional-wiehl.de']
  );
  
  if (result.rowCount > 0) {
    console.log('✅ Passwort aktualisiert für:', result.rows[0].email);
    
    // Testen
    const testResult = await pool.query('SELECT password FROM users WHERE email = $1', ['app@functional-wiehl.de']);
    const isValid = await bcrypt.compare(process.env.NEW_PASSWORD, testResult.rows[0].password);
    console.log('✅ Login-Test erfolgreich:', isValid);
  } else {
    console.log('❌ User nicht gefunden!');
  }
  
  await pool.end();
}

fixPassword().catch(console.error);
