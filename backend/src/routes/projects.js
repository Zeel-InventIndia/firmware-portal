const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.type, p.created_at,
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
  const { name, type } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });
  const projectType = type === 'app' ? 'app' : 'firmware';
  try {
    const { rows } = await pool.query(
      'INSERT INTO projects (name, type, created_by) VALUES ($1, $2, $3) RETURNING id, name, type, created_at',
      [name.trim(), projectType, req.user.id]
    );
    res.status(201).json({ project: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A project with that name already exists' });
    throw err;
  }
});
module.exports = router;
