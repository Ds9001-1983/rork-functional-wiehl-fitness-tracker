const bcrypt = require('bcryptjs');
const password = 'trainer123';
const hash = bcrypt.hashSync(password, 10);
console.log('Hash für trainer123:', hash);
console.log('Test mit trainer123:', bcrypt.compareSync('trainer123', hash));
