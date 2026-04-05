import { useState, useEffect, useCallback } from 'react';
import { api, Campaign, MetricsSnapshot } from '../api';

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function formatCurrency(n: number): string {
  return '$' + n.toFixed(2);
}

function formatPercent(n: number): string {
  return (n * 100).toFixed(2) + '%';
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'active' ? 'var(--green)' : status === 'paused' ? 'var(--orange)' : 'var(--text-secondary)';
  return (
    <span className="badge" style={{ background: color + '20', color, borderColor: color + '40' }}>
      {status}
    </span>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<Record<string, MetricsSnapshot>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailMetrics, setDetailMetrics] = useState<MetricsSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastPollResult, setLastPollResult] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      const camps = await api.getCampaigns();
      setCampaigns(camps);
      const results = await Promise.allSettled(
        camps.map(c => api.getLatestMetrics(c.id))
      );
      const metricsMap: Record<string, MetricsSnapshot> = {};
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') metricsMap[camps[i].id] = result.value;
      });
      setLatestMetrics(metricsMap);
    } catch {}
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  useEffect(() => {
    if (!selectedId) return;
    api.getCampaignMetrics(selectedId).then(setDetailMetrics).catch(() => setDetailMetrics([]));
  }, [selectedId, latestMetrics]);

  const handlePoll = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await api.pollMetrics();
      setLastPollResult(`Polled ${result.polled} campaigns. ${result.triggered} rules triggered.`);
      await loadCampaigns();
    } catch {
      setLastPollResult('Poll failed');
    }
    setLoading(false);
  };

  const handleAnomaly = async (type: string) => {
    if (!selectedId || loading) return;
    setLoading(true);
    try {
      await api.injectAnomaly(selectedId, type);
      await api.pollMetrics();
      await loadCampaigns();
    } catch {}
    setLoading(false);
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedId);
  const latest = selectedId ? detailMetrics[0] : null;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Campaigns</h2>
          {lastPollResult && <span className="text-secondary" style={{ fontSize: 12, marginLeft: 12 }}>{lastPollResult}</span>}
        </div>
        <button className="btn btn-primary" onClick={handlePoll} disabled={loading}>
          {loading ? 'Polling...' : 'Poll Metrics'}
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Budget</th>
              <th>Spend</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>Leads</th>
              <th>CPC</th>
              <th>CTR</th>
              <th>CPL</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => {
              const m = latestMetrics[c.id];
              return (
                <tr key={c.id} className={`clickable-row ${selectedId === c.id ? 'selected' : ''}`} onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}>
                  <td><div className="campaign-name">{c.name}</div><div className="campaign-id">{c.id}</div></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{formatCurrency(c.dailyBudget)}</td>
                  <td>{m ? formatCurrency(m.spend) : '-'}</td>
                  <td>{m ? formatNumber(m.impressions) : '-'}</td>
                  <td>{m ? formatNumber(m.clicks) : '-'}</td>
                  <td>{m ? m.leads : '-'}</td>
                  <td>{m ? formatCurrency(m.cpc) : '-'}</td>
                  <td>{m ? formatPercent(m.ctr) : '-'}</td>
                  <td className={m && m.cpl > 75 ? 'text-red' : m && m.cpl < 30 ? 'text-green' : ''}>{m ? formatCurrency(m.cpl) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedCampaign && (
        <div style={{ marginTop: 24 }}>
          <div className="section-header">
            <h2>Campaign Detail</h2>
            <div className="anomaly-controls">
              <span className="text-secondary">Inject:</span>
              <button className="btn btn-sm btn-danger" onClick={() => handleAnomaly('spike_cpl')} disabled={loading}>Spike CPL</button>
              <button className="btn btn-sm btn-warning" onClick={() => handleAnomaly('zero_leads')} disabled={loading}>Zero Leads</button>
              <button className="btn btn-sm btn-secondary" onClick={() => handleAnomaly('zero_impressions')} disabled={loading}>Zero Impr</button>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>{selectedCampaign.name}</h3>
            {latest ? (
              <>
                <div className="metrics-grid">
                  <MetricCard label="Spend" value={formatCurrency(latest.spend)} />
                  <MetricCard label="Impressions" value={formatNumber(latest.impressions)} />
                  <MetricCard label="Clicks" value={formatNumber(latest.clicks)} />
                  <MetricCard label="Leads" value={latest.leads.toString()} />
                  <MetricCard label="CPC" value={formatCurrency(latest.cpc)} />
                  <MetricCard label="CTR" value={formatPercent(latest.ctr)} />
                  <MetricCard label="CPL" value={formatCurrency(latest.cpl)} color={latest.cpl > 75 ? 'var(--red)' : latest.cpl < 30 ? 'var(--green)' : undefined} />
                  <MetricCard label="Reg Rate" value={formatPercent(latest.registrationRate)} />
                </div>
                <h4 style={{ margin: '20px 0 10px', fontSize: 14, color: 'var(--text-secondary)' }}>History ({detailMetrics.length} snapshots)</h4>
                <div className="history-table-wrap">
                  <table>
                    <thead><tr><th>Time</th><th>Spend</th><th>Imp</th><th>Clicks</th><th>Leads</th><th>CPC</th><th>CTR</th><th>CPL</th></tr></thead>
                    <tbody>
                      {detailMetrics.map(m => (
                        <tr key={m.id}>
                          <td>{new Date(m.timestamp).toLocaleTimeString()}</td>
                          <td>{formatCurrency(m.spend)}</td>
                          <td>{formatNumber(m.impressions)}</td>
                          <td>{formatNumber(m.clicks)}</td>
                          <td>{m.leads}</td>
                          <td>{formatCurrency(m.cpc)}</td>
                          <td>{formatPercent(m.ctr)}</td>
                          <td className={m.cpl > 75 ? 'text-red' : m.cpl < 30 ? 'text-green' : ''}>{formatCurrency(m.cpl)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-secondary">No metrics yet. Click "Poll Metrics".</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
