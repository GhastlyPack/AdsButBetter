import { useState, useEffect } from 'react';

const BASE = '/api';

interface SettingsData {
  enabled: boolean;
  metricsPollingIntervalMinutes: number;
  ruleEvaluationIntervalMinutes: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    enabled: true,
    metricsPollingIntervalMinutes: 5,
    ruleEvaluationIntervalMinutes: 5,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/settings`).then(r => r.json()).then(setSettings).catch(() => {});
  }, []);

  const update = async (changes: Partial<SettingsData>) => {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch(`${BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <div className="section-header">
        <h2>System Settings</h2>
        {saved && <span style={{ color: 'var(--green)', fontSize: 13 }}>Saved</span>}
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>System On/Off</div>
            <div className="text-secondary" style={{ fontSize: 13 }}>
              When off, the scheduler will not poll metrics or evaluate rules automatically. No Discord alerts will be sent. Manual polling from the dashboard still works.
            </div>
          </div>
          <button
            className={`toggle-btn ${settings.enabled ? 'on' : 'off'}`}
            onClick={() => update({ enabled: !settings.enabled })}
            disabled={loading}
          >
            <div className="toggle-knob" />
            <span className="toggle-label">{settings.enabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Scheduler Intervals</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Metrics Polling Interval (minutes)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.metricsPollingIntervalMinutes}
                onChange={e => setSettings({ ...settings, metricsPollingIntervalMinutes: Number(e.target.value) })}
                style={inputStyle}
              />
              <span className="text-secondary" style={{ fontSize: 13 }}>How often to pull new metrics data</span>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Rule Evaluation Interval (minutes)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.ruleEvaluationIntervalMinutes}
                onChange={e => setSettings({ ...settings, ruleEvaluationIntervalMinutes: Number(e.target.value) })}
                style={inputStyle}
              />
              <span className="text-secondary" style={{ fontSize: 13 }}>How often to check rules against metrics</span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => update({
              metricsPollingIntervalMinutes: settings.metricsPollingIntervalMinutes,
              ruleEvaluationIntervalMinutes: settings.ruleEvaluationIntervalMinutes,
            })}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save & Restart Scheduler'}
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Status</div>
        <div className="text-secondary" style={{ fontSize: 13, lineHeight: 1.8 }}>
          System: {settings.enabled
            ? <span style={{ color: 'var(--green)', fontWeight: 500 }}>Running</span>
            : <span style={{ color: 'var(--red)', fontWeight: 500 }}>Paused</span>
          }<br />
          Metrics polling: every <strong style={{ color: 'var(--text-primary)' }}>{settings.metricsPollingIntervalMinutes} min</strong><br />
          Rule evaluation: every <strong style={{ color: 'var(--text-primary)' }}>{settings.ruleEvaluationIntervalMinutes} min</strong>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: 80, padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 };
