import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StageLights from '../components/StageLights';

function UploadForm({ projectId, onCreated }) {
  const [version, setVersion] = useState('');
  const [note, setNote] = useState('');
  const [binFile, setBinFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    if (!binFile || !zipFile) {
      setError('Please attach both a .bin file and a .zip file.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('version', version);
      fd.append('note', note);
      fd.append('bin', binFile);
      fd.append('zip', zipFile);
      await api.createRelease(projectId, fd);
      setVersion('');
      setNote('');
      setBinFile(null);
      setZipFile(null);
      e.target.reset();
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <div className="section-title">Release new firmware</div>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Version</label>
          <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. v2.4.1" required />
        </div>
        <div className="field-row">
          <div className="field">
            <label>.bin file</label>
            <input type="file" accept=".bin" onChange={(e) => setBinFile(e.target.files[0])} required />
          </div>
          <div className="field">
            <label>.zip file</label>
            <input type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files[0])} required />
          </div>
        </div>
        <div className="field">
          <label>Release note</label>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed in this build…" />
        </div>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Uploading to Drive…' : 'Publish release'}
        </button>
      </form>
    </div>
  );
}

function StageEditor({ release, onUpdated }) {
  const [openStage, setOpenStage] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(stageNumber, status) {
    setBusy(true);
    try {
      await api.updateStage(release.id, stageNumber, status, remarks);
      setOpenStage(null);
      setRemarks('');
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stage-list">
      {release.stages.map((s) => (
        <div key={s.stage_number}>
          <div className="stage-row">
            <span className="stage-num mono">{s.stage_number}</span>
            <span className="stage-name">{s.stage_name}</span>
            {s.remarks && <span className="stage-remarks">"{s.remarks}"</span>}
            <span className={`status-pill ${s.status}`}>{s.status}</span>
            <button className="btn small ghost" onClick={() => setOpenStage(openStage === s.stage_number ? null : s.stage_number)}>
              Update
            </button>
          </div>
          {openStage === s.stage_number && (
            <div className="panel" style={{ marginTop: 6, marginBottom: 6 }}>
              <div className="field">
                <label>Remarks</label>
                <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Testing notes / reason…" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn primary" disabled={busy} onClick={() => submit(s.stage_number, 'passed')}>
                  Mark passed
                </button>
                <button className="btn" disabled={busy} onClick={() => submit(s.stage_number, 'failed')}>
                  Mark failed
                </button>
                <button className="btn ghost" disabled={busy} onClick={() => submit(s.stage_number, 'pending')}>
                  Reset to pending
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ReleaseCard({ release, isAdmin, onUpdated }) {
  const [downloading, setDownloading] = useState('');

  async function download(fileType) {
    setDownloading(fileType);
    try {
      await api.downloadFile(release.id, fileType);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading('');
    }
  }

  return (
    <div className="panel release-card">
      <div className="release-header">
        <div>
          <span className="release-version">{release.version}</span>
          <div className="release-meta">Released {new Date(release.created_at).toLocaleString()}</div>
        </div>
        <span className={`status-pill ${release.overall_status}`}>{release.overall_status}</span>
      </div>
      {release.note && <div className="release-note">{release.note}</div>}

      <StageLights stages={release.stages} />

      {release.files_available ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn" disabled={downloading === 'bin'} onClick={() => download('bin')}>
            {downloading === 'bin' ? 'Fetching…' : `Download ${release.bin_file_name || '.bin'}`}
          </button>
          <button className="btn" disabled={downloading === 'zip'} onClick={() => download('zip')}>
            {downloading === 'zip' ? 'Fetching…' : `Download ${release.zip_file_name || '.zip'}`}
          </button>
        </div>
      ) : (
        <div className="release-meta" style={{ marginTop: 14 }}>
          {release.overall_status === 'rejected'
            ? 'This build did not pass approval — files are not available.'
            : 'Files unlock once all approval stages pass.'}
        </div>
      )}

      {isAdmin && (
        <>
          <div className="divider" />
          <div className="section-title" style={{ marginBottom: 8 }}>Approval stages</div>
          <StageEditor release={release} onUpdated={onUpdated} />
        </>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [releases, setReleases] = useState(null);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState('');

  function load() {
    api.listReleases(projectId).then((d) => setReleases(d.releases)).catch((e) => setError(e.message));
    api.listProjects().then((d) => {
      const p = d.projects.find((x) => String(x.id) === String(projectId));
      if (p) setProjectName(p.name);
    });
  }

  useEffect(load, [projectId]);

  return (
    <div className="main">
      <Link to="/projects" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>&larr; All projects</Link>
      <h2 style={{ marginTop: 8 }}>{projectName || 'Project'}</h2>

      {error && <div className="error-box">{error}</div>}

      {user.role === 'admin' && (
        <div style={{ marginBottom: 20 }}>
          <UploadForm projectId={projectId} onCreated={load} />
        </div>
      )}

      <div className="section-title">Releases</div>

      {!releases && <p className="loading-flicker">Loading releases…</p>}
      {releases && releases.length === 0 && <div className="empty-state">No firmware released for this project yet.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {releases &&
          releases.map((r) => (
            <ReleaseCard key={r.id} release={r} isAdmin={user.role === 'admin'} onUpdated={load} />
          ))}
      </div>
    </div>
  );
}
