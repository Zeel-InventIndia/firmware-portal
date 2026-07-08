import React, { useEffect, useState } from 'react';
import { api } from '../api';

function TicketRow({ ticket, onUpdated }) {
  const [status, setStatus] = useState(ticket.status);
  const [notes, setNotes] = useState(ticket.admin_notes || '');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.updateTicket(ticket.id, { status, admin_notes: notes });
      setOpen(false);
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr>
        <td className="mono">{ticket.ticket_code}</td>
        <td>{ticket.name}<br /><span className="release-meta">{ticket.designation}</span></td>
        <td>{ticket.note}</td>
        <td className="mono">{ticket.urgency}</td>
        <td>{ticket.deadline || '—'}</td>
        <td><span className={`status-pill ${ticket.status}`}>{ticket.status.replace('_', ' ')}</span></td>
        <td><button className="btn small ghost" onClick={() => setOpen((o) => !o)}>Manage</button></td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7}>
            <div className="panel" style={{ margin: '8px 0' }}>
              <div className="field-row">
                <div className="field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Admin notes</label>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <button className="btn primary" disabled={busy} onClick={save}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.listTickets(filter || undefined).then((d) => setTickets(d.tickets)).catch((e) => setError(e.message));
  }

  useEffect(load, [filter]);

  return (
    <div className="main">
      <h2>Manage tickets</h2>
      {error && <div className="error-box">{error}</div>}

      <div className="field" style={{ maxWidth: 220 }}>
        <label>Filter by status</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {!tickets && <p className="loading-flicker">Loading tickets…</p>}
      {tickets && tickets.length === 0 && <div className="empty-state">No tickets found.</div>}

      {tickets && tickets.length > 0 && (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Raised by</th><th>Note</th><th>Urgency</th><th>Deadline</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <TicketRow key={t.id} ticket={t} onUpdated={load} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
