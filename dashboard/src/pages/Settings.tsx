import { useState, useEffect } from 'react';

const BASE = '/api';

export default function SettingsPage() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/settings`).then(r => r.json()).then(d => setEnabled(d.enabled)).catch(() => {});
  }, []);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const data = await res.json();
      setEnabled(data.enabled);
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <div className="section-header">
        <h2>System Settings</h2>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>System On/Off</div>
            <div className="text-secondary" style={{ fontSize: 13 }}>
              When off, the scheduler will not poll metrics or evaluate rules. No Discord alerts will be sent. Manual polling from the dashboard still works.
            </div>
          </div>
          <button
            className={`toggle-btn ${enabled ? 'on' : 'off'}`}
            onClick={toggle}
            disabled={loading}
          >
            <div className="toggle-knob" />
            <span className="toggle-label">{enabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 500, marginTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Scheduler</div>
        <div className="text-secondary" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Metrics poll interval: <strong style={{ color: 'var(--text-primary)' }}>5 minutes</strong><br />
          Rule evaluation interval: <strong style={{ color: 'var(--text-primary)' }}>5 minutes</strong><br />
          <br />
          Status: {enabled
            ? <span style={{ color: 'var(--green)' }}>Running</span>
            : <span style={{ color: 'var(--red)' }}>Paused</span>
          }
        </div>
      </div>
    </div>
  );
}
