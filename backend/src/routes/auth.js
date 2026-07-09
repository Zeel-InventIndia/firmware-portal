const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth, requireAdmin, PERMISSION_KEYS } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  // Kept intentionally minimal — role and permissions are always re-read fresh from
  // the DB on every request (see middleware/auth.js), so the token just proves identity.
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '12h' });
}

function cleanPermissions(input) {
  const out = {};
  if (input && typeof input === 'object') {
    for (const key of PERMISSION_KEYS) {
      out[key] = !!input[key];
    }
  } else {
    for (const key of PERMISSION_KEYS) out[key] = false;
  }
  return out;
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions || {} },
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Admin: create a new user (admin or viewer), with optional per-stage / early-access permissions
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, role, permissions } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password and role are required' });
  }
  if (!['admin', 'viewer'].includes(role)) {
    return res.status(400).json({ error: "role must be 'admin' or 'viewer'" });
  }
  const hash = await bcrypt.hash(password, 10);
  const perms = cleanPermissions(permissions);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, permissions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, permissions, created_at`,
      [name, email.toLowerCase(), hash, role, JSON.stringify(perms)]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A user with that email already exists' });
    throw err;
  }
});

// Admin: update an existing user's role / permissions
router.patch('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { role, permissions } = req.body || {};
  const fields = [];
  const values = [];
  let i = 1;

  if (role) {
    if (!['admin', 'viewer'].includes(role)) return res.status(400).json({ error: "role must be 'admin' or 'viewer'" });
    fields.push(`role = $${i++}`);
    values.push(role);
  }
  if (permissions !== undefined) {
    fields.push(`permissions = $${i++}`);
    values.push(JSON.stringify(cleanPermissions(permissions)));
  }
  if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, name, email, role, permissions, created_at`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json({ user: rows[0] });
});

// Admin: list users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, permissions, created_at FROM users ORDER BY created_at DESC'
  );
  res.json({ users: rows });
});

module.exports = router;
