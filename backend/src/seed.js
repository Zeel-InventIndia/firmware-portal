require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initDb } = require('./db');

async function main() {
  await initDb();

  const name = process.env.SEED_ADMIN_NAME || 'Admin';
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'change_me_now';

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows[0]) {
    console.log(`Admin user ${email} already exists. Nothing to do.`);
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
    [name, email, hash, 'admin']
  );
  console.log(`Created admin user: ${email} / ${password}`);
  console.log('Log in and change this password by creating a new admin user + retiring this one if needed.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
