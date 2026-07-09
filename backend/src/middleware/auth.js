const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const PERMISSION_KEYS = ['early_access', 'stage_1', 'stage_2', 'stage_3', 'stage_4'];

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, permissions FROM users WHERE id = $1',
      [payload.id]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    // Looking this up fresh (rather than trusting the JWT payload) means role/permission
    // changes made by an admin take effect on the user's very next request, not just
    // after they log in again.
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/** True if the user is an admin, or has the given permission key set to true. */
function hasPermission(user, key) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return !!(user.permissions && user.permissions[key] === true);
}

module.exports = { requireAuth, requireAdmin, hasPermission, PERMISSION_KEYS };
