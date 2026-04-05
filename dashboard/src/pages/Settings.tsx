import { useState, useEffect } from 'react';

const BASE = '/api';

interface SettingsData {
  enabled: boolean;
  aiReasoningEnabled: boolean;
  aiConfigured: boolean;
  metricsPollingIntervalMinutes: number;
  ruleEvaluationIntervalMinutes: number;
  dataSource: 'mock' | 'meta';
  metaAdAccountId: string;
  metaConnected: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    enabled: true,
    aiReasoningEnabled: false,
    aiConfigured: false,
    metricsPollingIntervalMinutes: 5,
    ruleEvaluationIntervalMinutes: 5,
    dataSource: 'mock',
    metaAdAccountId: '',
    metaConnected: false,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [metaToken, setMetaToken] = useState('');
  const [metaAccountId, setMetaAccountId] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; campaigns?: number; error?: string } | null>(null);

  useEffect(() => {
    fetch(`${BASE}/settings`).then(r => r.json()).then(setSettings).catch(() => {});
  }, []);

  const update = async (changes: Record<string, any>) => {
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

  const testMeta = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`${BASE}/settings/test-meta`, { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, error: String(err) });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="section-header">
        <h2>System Settings</h2>
        {saved && <span style={{ color: 'var(--green)', fontSize: 13 }}>Saved</span>}
      </div>

      {/* System Toggle */}
      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>System On/Off</div>
            <div className="text-secondary" style={{ fontSize: 13 }}>
              When off, the scheduler stops automatic polling and evaluation. Manual actions still work.
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

      {/* AI Reasoning */}
      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>AI Reasoning (Claude)</div>
            <div className="text-secondary" style={{ fontSize: 13 }}>
              {settings.aiConfigured
                ? 'When enabled, Claude analyzes campaign data and provides intelligent confidence scores and reasoning for each recommendation.'
                : 'Add ANTHROPIC_API_KEY to your .env to enable AI-powered reasoning.'}
            </div>
          </div>
          <button
            className={`toggle-btn ${settings.aiReasoningEnabled ? 'on' : 'off'}`}
            onClick={() => update({ aiReasoningEnabled: !settings.aiReasoningEnabled })}
            disabled={loading || !settings.aiConfigured}
          >
            <div className="toggle-knob" />
            <span className="toggle-label">{settings.aiReasoningEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Data Source */}
      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Data Source</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className={`source-btn ${settings.dataSource === 'mock' ? 'active' : ''}`}
            onClick={() => update({ dataSource: 'mock' })}
            disabled={loading}
          >
            <div className="source-btn-title">Mock Data</div>
            <div className="source-btn-desc">Simulated campaigns for testing</div>
          </button>
          <button
            className={`source-btn ${settings.dataSource === 'meta' ? 'active' : ''}`}
            onClick={() => settings.metaConnected ? update({ dataSource: 'meta' }) : null}
            disabled={loading || !settings.metaConnected}
          >
            <div className="source-btn-title">Meta Ads</div>
            <div className="source-btn-desc">{settings.metaConnected ? 'Connected' : 'Not configured'}</div>
          </button>
        </div>
      </div>

      {/* Meta Configuration */}
      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Meta Ads Connection</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Ad Account ID</label>
            <input
              type="text"
              value={metaAccountId}
              onChange={e => setMetaAccountId(e.target.value)}
              placeholder="e.g. 123456789"
              style={{ ...inputStyle, width: '100%' }}
            />
            <div className="text-secondary" style={{ fontSize: 11, marginTop: 4 }}>
              Found in Meta Business Manager under Ad Accounts. Don't include "act_" prefix.
            </div>
          </div>

          <div>
            <label style={labelStyle}>Access Token</label>
            <input
              type="password"
              value={metaToken}
              onChange={e => setMetaToken(e.target.value)}
              placeholder="Your Meta access token"
              style={{ ...inputStyle, width: '100%' }}
            />
            <div className="text-secondary" style={{ fontSize: 11, marginTop: 4 }}>
              Generate from Meta Graph API Explorer or your Meta App.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => update({ metaAccessToken: metaToken, metaAdAccountId: metaAccountId })}
              disabled={loading || !metaToken || !metaAccountId}
            >
              Save Credentials
            </button>
            <button
              className="btn btn-secondary"
              onClick={testMeta}
              disabled={loading}
            >
              Test Connection
            </button>
          </div>

          {testResult && (
            <div style={{
              padding: 12,
              borderRadius: 6,
              background: testResult.success ? 'var(--green)15' : 'var(--red)15',
              border: `1px solid ${testResult.success ? 'var(--green)' : 'var(--red)'}40`,
              fontSize: 13,
            }}>
              {testResult.success
                ? <span style={{ color: 'var(--green)' }}>Connected! Found {testResult.campaigns} campaigns.</span>
                : <span style={{ color: 'var(--red)' }}>Connection failed: {testResult.error}</span>
              }
            </div>
          )}

          {settings.metaConnected && (
            <div className="text-secondary" style={{ fontSize: 13 }}>
              Currently connected. Account: {settings.metaAdAccountId}
            </div>
          )}
        </div>
      </div>

      {/* Scheduler */}
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
              <span className="text-secondary" style={{ fontSize: 13 }}>How often to pull new metrics</span>
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
              <span className="text-secondary" style={{ fontSize: 13 }}>How often to check rules</span>
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

      {/* Danger Zone */}
      <div className="card" style={{ maxWidth: 560, marginTop: 16, borderColor: 'var(--red)40' }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: 'var(--red)' }}>Danger Zone</div>
        <p className="text-secondary" style={{ fontSize: 13, marginBottom: 12 }}>
          Clear all metrics, recommendations, and decision logs. Use this when transitioning from test data to live Meta data.
        </p>
        <button
          className="btn btn-danger"
          onClick={async () => {
            if (!confirm('Are you sure? This will delete ALL metrics, recommendations, and decision history.')) return;
            setLoading(true);
            await fetch(`${BASE}/clear-history`, { method: 'POST' });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            setLoading(false);
          }}
          disabled={loading}
        >
          Clear All History
        </button>
      </div>

      {/* Status */}
      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Status</div>
        <div className="text-secondary" style={{ fontSize: 13, lineHeight: 1.8 }}>
          System: {settings.enabled
            ? <span style={{ color: 'var(--green)', fontWeight: 500 }}>Running</span>
            : <span style={{ color: 'var(--red)', fontWeight: 500 }}>Paused</span>
          }<br />
          Data source: <strong style={{ color: 'var(--text-primary)' }}>{settings.dataSource === 'meta' ? 'Meta Ads (Live)' : 'Mock Data'}</strong><br />
          Metrics polling: every <strong style={{ color: 'var(--text-primary)' }}>{settings.metricsPollingIntervalMinutes} min</strong><br />
          Rule evaluation: every <strong style={{ color: 'var(--text-primary)' }}>{settings.ruleEvaluationIntervalMinutes} min</strong>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: 80, padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14 };
