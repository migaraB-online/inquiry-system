require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/db');

const users = [
  { email: 'alice@coffeeninja.lk', name: 'Alice Perera', password: 'Password123!' },
  { email: 'bob@coffeeninja.lk', name: 'Bob Silva', password: 'Password123!' },
];

async function seed() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [u.email, u.name, hash]
    );
    console.log('Seeded:', u.email);
  }
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});