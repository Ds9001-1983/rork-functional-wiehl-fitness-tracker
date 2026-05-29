const bcrypt = require('bcryptjs');
const password = process.env.TEST_PASSWORD || process.argv[2];
if (!password) {
  console.error('Bitte Passwort via TEST_PASSWORD env oder als Argument übergeben.');
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 10);
console.log('Hash:', hash);
console.log('Test:', bcrypt.compareSync(password, hash));
