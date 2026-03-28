const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function fixPassword() {
  const pool = new Pool({
    connectionString: 'postgresql://app_user:LKW_Peter123@localhost:5432/fitness_app'
  });

  // Neuen Hash mit lokalem bcrypt generieren
  const newHash = await bcrypt.hash('trainer123', 10);
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
    const isValid = await bcrypt.compare('trainer123', testResult.rows[0].password);
    console.log('✅ Login-Test erfolgreich:', isValid);
  } else {
    console.log('❌ User nicht gefunden!');
  }
  
  await pool.end();
}

fixPassword().catch(console.error);
