const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
      }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      }
);

const PROJECT_SEED = [
  'Production(old knob)',
  'Production(Current knob)',
  'Antunes',
  'Dubai',
  'AI',
  'life cycle testing',
];

async function initDb() {
  // Create all tables
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  // -------------------------------------------------
  // Seed default projects
  // -------------------------------------------------
  const projectCount = await pool.query(
    'SELECT COUNT(*)::int AS count FROM projects'
  );

  if (projectCount.rows[0].count === 0) {
    for (const name of PROJECT_SEED) {
      await pool.query(
        'INSERT INTO projects (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      );
    }

    console.log(`Seeded ${PROJECT_SEED.length} default projects.`);
  }

  // -------------------------------------------------
  // Seed default admin user
  // -------------------------------------------------
  const adminName = process.env.SEED_ADMIN_NAME;
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminName && adminEmail && adminPassword) {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail.toLowerCase()]
    );

    if (existing.rows.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      await pool.query(
        `
        INSERT INTO users
        (name, email, password_hash, role)
        VALUES ($1, $2, $3, 'admin')
        `,
        [
          adminName,
          adminEmail.toLowerCase(),
          passwordHash,
        ]
      );

      console.log('✅ Default admin user created.');
    } else {
      console.log('✅ Default admin already exists.');
    }
  } else {
    console.warn(
      '⚠️ SEED_ADMIN_NAME / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set. Skipping admin creation.'
    );
  }
}

module.exports = {
  pool,
  initDb,
};
