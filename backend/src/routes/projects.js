const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.created_at,
            COUNT(r.id)::int AS release_count
     FROM projects p
     LEFT JOIN releases r ON r.project_id = p.id
     GROUP BY p.id
     ORDER BY p.name ASC`
  );
  res.json({ projects: rows });
});

// Admin only: add a new project
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO projects (name, created_by) VALUES ($1, $2) RETURNING id, name, created_at',
      [name.trim(), req.user.id]
    );
    res.status(201).json({ project: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A project with that name already exists' });
    throw err;
  }
});

module.exports = router;
