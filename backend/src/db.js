const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
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
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  // Seed the default project list if the projects table is empty.
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM projects');
  if (rows[0].count === 0) {
    for (const name of PROJECT_SEED) {
      await pool.query('INSERT INTO projects (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    }
    console.log(`Seeded ${PROJECT_SEED.length} default projects.`);
  }
}

module.exports = { pool, initDb };
