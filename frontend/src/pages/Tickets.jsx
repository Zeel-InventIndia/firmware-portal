import React, { useState } from 'react';
import { api } from '../api';

function NewTicketForm() {
  const [designation, setDesignation] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { ticket } = await api.createTicket({ designation, name, note, urgency, deadline: deadline || null });
      setCreated(ticket);
      setDesignation('');
      setName('');
      setNote('');
      setUrgency('medium');
      setDeadline('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <div className="section-title">Raise a ticket</div>
      {error && <div className="error-box">{error}</div>}
      {created && (
        <div className="success-box">
          Ticket created. Save this ID to track it later: <span className="ticket-code">{created.ticket_code}</span>
        </div>
      )}
      <form onSubmit={onSubmit}>
        <div className="field-row">
          <div className="field">
            <label>Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Designation</label>
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label>Note (issue or feature required)</label>
          <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} required />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Urgency</label>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="field">
            <label>Deadline (optional)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit ticket'}
        </button>
      </form>
    </div>
  );
}

function TrackTicket() {
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setTicket(null);
    try {
      const { ticket } = await api.trackTicket(code.trim());
      setTicket(ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <div className="section-title">Track a ticket</div>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit} className="field-row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ marginBottom: 0, flex: 2 }}>
          <label>Ticket ID</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TCK-00012" required />
        </div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Looking up…' : 'Track'}
        </button>
      </form>

      {ticket && (
        <div style={{ marginTop: 16 }}>
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span className="ticket-code">{ticket.ticket_code}</span>
            <span className={`status-pill ${ticket.status}`}>{ticket.status.replace('_', ' ')}</span>
          </div>
          <p><strong>{ticket.name}</strong> ({ticket.designation}) — urgency: {ticket.urgency}</p>
          <p style={{ color: 'var(--silkscreen-dim)' }}>{ticket.note}</p>
          {ticket.deadline && <p className="release-meta">Deadline: {ticket.deadline}</p>}
          {ticket.admin_notes && (
            <>
              <div className="divider" />
              <div className="section-title">Admin notes</div>
              <p style={{ color: 'var(--silkscreen-dim)' }}>{ticket.admin_notes}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Tickets() {
  return (
    <div className="main">
      <h2>Tickets</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NewTicketForm />
        <TrackTicket />
      </div>
    </div>
  );
}
