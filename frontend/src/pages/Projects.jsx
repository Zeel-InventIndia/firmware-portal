import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function ProjectCard({ project, isAdmin, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function saveRename(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim() || name.trim() === project.name) {
      setEditing(false);
      setName(project.name);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.renameProject(project.id, name.trim());
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Delete project "${project.name}"? This deletes all its releases and files. This cannot be undone.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await api.deleteProject(project.id);
      onUpdated();
    } catch (err) {
      alert(err.message);
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="project-card" onClick={(e) => e.preventDefault()}>
        <form onSubmit={saveRename} onClick={(e) => e.stopPropagation()}>
          {error && <div className="error-box" style={{ marginBottom: 8 }}>{error}</div>}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            style={{ width: '100%', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn small primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              className="btn small ghost"
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                setEditing(false);
                setName(project.name);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <h3>{project.name}</h3>
      <div className="meta">
        {project.release_count} release{project.release_count === 1 ? '' : 's'} &middot;{' '}
        {project.type === 'app' ? 'App' : 'Firmware'}
      </div>
      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            className="btn small ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditing(true);
            }}
          >
            Edit
          </button>
          <button className="btn small ghost" disabled={busy} onClick={handleDelete}>
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}
    </Link>
  );
}

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
            <ProjectCard key={p.id} project={p} isAdmin={user.role === 'admin'} onUpdated={load} />
          ))}
      </div>
    </div>
  );
}
