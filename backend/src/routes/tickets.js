const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function generateTicketCode() {
  const { rows } = await pool.query("SELECT nextval(pg_get_serial_sequence('tickets','id')) AS n");
  const n = rows[0].n;
  return `TCK-${String(n).padStart(5, '0')}`;
}

// Anyone logged in can raise a ticket
router.post('/', requireAuth, async (req, res) => {
  const { designation, name, note, urgency, deadline, project_id } = req.body || {};
  if (!designation || !name || !note) {
    return res.status(400).json({ error: 'designation, name and note are required' });
  }
  const ticket_code = await generateTicketCode();

  const { rows } = await pool.query(
    `INSERT INTO tickets (ticket_code, designation, name, note, urgency, deadline, project_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [ticket_code, designation, name, note, urgency || 'medium', deadline || null, project_id || null, req.user.id]
  );
  res.status(201).json({ ticket: rows[0] });
});

// Track a ticket by its code — anyone logged in, using just the code
router.get('/track/:code', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tickets WHERE ticket_code = $1', [req.params.code.toUpperCase()]);
  if (!rows[0]) return res.status(404).json({ error: 'No ticket found with that ID' });
  res.json({ ticket: rows[0] });
});

// Admin: list & filter all tickets
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query;
  const params = [];
  let q = 'SELECT * FROM tickets';
  if (status) {
    params.push(status);
    q += ' WHERE status = $1';
  }
  q += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(q, params);
  res.json({ tickets: rows });
});

// Admin: update ticket status / add notes
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { status, admin_notes } = req.body || {};
  const fields = [];
  const values = [];
  let i = 1;

  if (status) {
    if (!['open', 'in_progress', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    fields.push(`status = $${i++}`);
    values.push(status);
  }
  if (admin_notes !== undefined) {
    fields.push(`admin_notes = $${i++}`);
    values.push(admin_notes);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  fields.push(`updated_at = now()`);
  values.push(req.params.id);

  const { rows } = await pool.query(
    `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ticket: rows[0] });
});

module.exports = router;
