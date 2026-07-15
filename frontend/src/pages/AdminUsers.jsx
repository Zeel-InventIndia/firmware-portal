import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
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

function PermissionCheckboxes({ permissions, onToggle }) {
  return (
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
            checked={!!permissions[p.key]}
            onChange={() => onToggle(p.key)}
            style={{ width: 16, height: 16, flexShrink: 0 }}
          />
          {p.label}
        </label>
      ))}
    </div>
  );
}

function EditUserRow({ user, onSaved, onCancel }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState({ ...EMPTY_PERMISSIONS, ...(user.permissions || {}) });
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function togglePermission(key) {
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { name, email, role, permissions };
      if (newPassword) payload.password = newPassword;
      await api.updateUser(user.id, payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td colSpan={5}>
        <div className="panel" style={{ margin: '8px 0' }}>
          {error && <div className="error-box">{error}</div>}
          <form onSubmit={save}>
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
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="field">
                <label>Reset password (optional)</label>
                <PasswordField
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current password"
                />
              </div>
            </div>

            {role === 'viewer' && (
              <div className="field">
                <label>Access permissions</label>
                <PermissionCheckboxes permissions={permissions} onToggle={togglePermission} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button className="btn ghost" type="button" disabled={busy} onClick={onCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </td>
    </tr>
  );
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [permissions, setPermissions] = useState(EMPTY_PERMISSIONS);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  async function handleDelete(u) {
    const ok = window.confirm(`Delete user "${u.name}" (${u.email})? This cannot be undone.`);
    if (!ok) return;
    setDeletingId(u.id);
    try {
      await api.deleteUser(u.id);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
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
              <PermissionCheckboxes permissions={permissions} onToggle={togglePermission} />
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
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Permissions</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) =>
                editingId === u.id ? (
                  <EditUserRow
                    key={u.id}
                    user={u}
                    onSaved={() => {
                      setEditingId(null);
                      load();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="mono">{u.email}</td>
                    <td><span className={`role-tag ${u.role}`}>{u.role}</span></td>
                    <td>{u.role === 'admin' ? <span className="release-meta">all (admin)</span> : <PermissionSummary permissions={u.permissions} />}</td>
                    <td className="release-meta">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn small ghost" onClick={() => setEditingId(u.id)}>
                          Edit
                        </button>
                        {String(u.id) !== String(currentUser.id) && (
                          <button
                            className="btn small ghost"
                            disabled={deletingId === u.id}
                            onClick={() => handleDelete(u)}
                          >
                            {deletingId === u.id ? 'Deleting…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
