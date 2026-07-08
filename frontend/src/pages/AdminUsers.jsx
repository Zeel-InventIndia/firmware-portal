import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.listUsers().then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createUser({ name, email, password, role });
      setName('');
      setEmail('');
      setPassword('');
      setRole('viewer');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="main">
      <h2>Users</h2>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="section-title">Add a user</div>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field-row">
            <div className="field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Temporary password</label>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create user'}
          </button>
        </form>
      </div>

      <div className="section-title">All users</div>
      {!users && <p className="loading-flicker">Loading users…</p>}
      {users && (
        <div className="panel">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="mono">{u.email}</td>
                  <td><span className={`role-tag ${u.role}`}>{u.role}</span></td>
                  <td className="release-meta">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
