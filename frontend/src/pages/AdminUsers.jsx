import React, { useEffect, useState } from 'react';
import { api } from '../api';
import PasswordField from '../components/PasswordField';

const PERMISSION_OPTIONS = [
  { key: 'early_access', label: 'Download / use firmware before it fully passes release' },
  { key: 'stage_1', label: 'Approve as Firmware Team (stage 1)' },
  { key: 'stage_2', label: 'Approve as QC Team (stage 2)' },
  { key: 'stage_3', label: 'Approve as Kitchen Team (stage 3)' },
  { key: 'stage_4', label: 'Approve as Sandy Sir (stage 4)' },
];

const EMPTY_PERMISSIONS = PERMISSION_OPTIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {});

function PermissionSummary({ permissions }) {
  const active = PERMISSION_OPTIONS.filter((p) => permissions?.[p.key]);
  if (active.length === 0) return <span className="release-meta">—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {active.map((p) => (
        <span key={p.key} className="status-pill pending" style={{ fontSize: 9 }}>
          {p.key === 'early_access' ? 'early access' : p.key.replace('_', ' ')}
        </span>
      ))}
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [permissions, setPermissions] = useState(EMPTY_PERMISSIONS);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.listUsers().then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  function togglePermission(key) {
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createUser({ name, email, password, role, permissions });
      setName('');
      setEmail('');
      setPassword('');
      setRole('viewer');
      setPermissions(EMPTY_PERMISSIONS);
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
              <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {role === 'viewer' && (
            <div className="field">
              <label>Access permissions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {PERMISSION_OPTIONS.map((p) => (
                  <label
                    key={p.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textTransform: 'none',
                      fontFamily: 'var(--sans)',
                      fontSize: 13,
                      color: 'var(--silkscreen)',
                      letterSpacing: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={permissions[p.key]}
                      onChange={() => togglePermission(p.key)}
                      style={{ width: 16, height: 16, flexShrink: 0 }}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button className="btn primary" type="submit" disabled={busy} style={{ marginTop: 10 }}>
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
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Permissions</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="mono">{u.email}</td>
                  <td><span className={`role-tag ${u.role}`}>{u.role}</span></td>
                  <td>{u.role === 'admin' ? <span className="release-meta">all (admin)</span> : <PermissionSummary permissions={u.permissions} />}</td>
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
