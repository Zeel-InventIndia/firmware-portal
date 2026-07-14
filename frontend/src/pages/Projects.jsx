import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('firmware');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  function load() {
    api.listProjects().then((d) => setProjects(d.projects)).catch((e) => setError(e.message));
  }
  useEffect(load, []);
  async function createProject(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createProject(newName.trim(), newType);
      setNewName('');
      setNewType('firmware');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="main">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Projects</h2>
        {user.role === 'admin' && (
          <button className="btn" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ New project'}
          </button>
        )}
      </div>
      {showForm && (
        <div className="panel" style={{ marginBottom: 20 }}>
          {error && <div className="error-box">{error}</div>}
          <form onSubmit={createProject}>
            <div className="field-row" style={{ alignItems: 'flex-end' }}>
              <div className="field" style={{ marginBottom: 0, flex: 3 }}>
                <label>Project name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} required autoFocus />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <label>Project type</label>
                <div style={{ display: 'flex', gap: 16, height: 38, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'normal' }}>
                    <input
                      type="radio"
                      name="project-type"
                      value="firmware"
                      checked={newType === 'firmware'}
                      onChange={() => setNewType('firmware')}
                    />
                    Firmware
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'normal' }}>
                    <input
                      type="radio"
                      name="project-type"
                      value="app"
                      checked={newType === 'app'}
                      onChange={() => setNewType('app')}
                    />
                    App
                  </label>
                </div>
              </div>
              <button className="btn primary" type="submit" disabled={busy}>
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
      {!showForm && error && <div className="error-box">{error}</div>}
      {!projects && <p className="loading-flicker">Loading projects…</p>}
      {projects && projects.length === 0 && <div className="empty-state">No projects yet.</div>}
      <div className="grid">
        {projects &&
          projects.map((p) => (
            <Link to={`/projects/${p.id}`} className="project-card" key={p.id}>
              <h3>{p.name}</h3>
              <div className="meta">
                {p.release_count} release{p.release_count === 1 ? '' : 's'} &middot;{' '}
                {p.type === 'app' ? 'App' : 'Firmware'}
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
