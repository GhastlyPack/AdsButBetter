import { useState, useEffect, useCallback } from 'react';
import { api, Campaign, MetricsSnapshot } from './api';
import './App.css';

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

function CampaignRow({
  campaign,
  metrics,
  selected,
  onClick,
}: {
  campaign: Campaign;
  metrics: MetricsSnapshot | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <tr className={`campaign-row ${selected ? 'selected' : ''}`} onClick={onClick}>
      <td>
        <div className="campaign-name">{campaign.name}</div>
        <div className="campaign-id">{campaign.id}</div>
      </td>
      <td><StatusBadge status={campaign.status} /></td>
      <td>{formatCurrency(campaign.daily_budget)}</td>
      <td>{metrics ? formatCurrency(metrics.spend) : '-'}</td>
      <td>{metrics ? formatNumber(metrics.impressions) : '-'}</td>
      <td>{metrics ? formatNumber(metrics.clicks) : '-'}</td>
      <td>{metrics ? metrics.leads : '-'}</td>
      <td>{metrics ? formatCurrency(metrics.cpc) : '-'}</td>
      <td>{metrics ? formatPercent(metrics.ctr) : '-'}</td>
      <td className={metrics && metrics.cpl > 75 ? 'text-red' : metrics && metrics.cpl < 30 ? 'text-green' : ''}>
        {metrics ? formatCurrency(metrics.cpl) : '-'}
      </td>
    </tr>
  );
}

function CampaignDetail({ campaign, metrics }: { campaign: Campaign; metrics: MetricsSnapshot[] }) {
  if (metrics.length === 0) {
    return <div className="detail-panel"><p className="text-secondary">No metrics data yet. Click "Poll Metrics" to generate data.</p></div>;
  }

  const latest = metrics[0];

  return (
    <div className="detail-panel">
      <h3>{campaign.name}</h3>
      <div className="metrics-grid">
        <MetricCard label="Spend" value={formatCurrency(latest.spend)} />
        <MetricCard label="Impressions" value={formatNumber(latest.impressions)} />
        <MetricCard label="Clicks" value={formatNumber(latest.clicks)} />
        <MetricCard label="Leads" value={latest.leads.toString()} />
        <MetricCard label="CPC" value={formatCurrency(latest.cpc)} />
        <MetricCard label="CTR" value={formatPercent(latest.ctr)} />
        <MetricCard label="CPL" value={formatCurrency(latest.cpl)} color={latest.cpl > 75 ? 'var(--red)' : latest.cpl < 30 ? 'var(--green)' : undefined} />
        <MetricCard label="Reg Rate" value={formatPercent(latest.registration_rate)} />
        {latest.qualified_leads != null && (
          <MetricCard label="Qualified Leads" value={latest.qualified_leads.toString()} color="var(--blue)" />
        )}
        {latest.cpql != null && (
          <MetricCard label="CPQL" value={formatCurrency(latest.cpql)} />
        )}
      </div>

      <h4>History ({metrics.length} snapshots)</h4>
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Spend</th>
              <th>Imp</th>
              <th>Clicks</th>
              <th>Leads</th>
              <th>CPC</th>
              <th>CTR</th>
              <th>CPL</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
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
    </div>
  );
}

export default function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<Record<string, MetricsSnapshot>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailMetrics, setDetailMetrics] = useState<MetricsSnapshot[]>([]);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      const camps = await api.getCampaigns();
      setCampaigns(camps);

      const metricsMap: Record<string, MetricsSnapshot> = {};
      for (const c of camps) {
        try {
          const m = await api.getLatestMetrics(c.id);
          metricsMap[c.id] = m;
        } catch {
          // No metrics yet
        }
      }
      setLatestMetrics(metricsMap);
      setError(null);
    } catch (err) {
      setError('Failed to load campaigns. Is the backend running?');
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!selectedId) return;
    api.getCampaignMetrics(selectedId).then(setDetailMetrics).catch(() => setDetailMetrics([]));
  }, [selectedId, latestMetrics]);

  const handlePoll = async () => {
    setPolling(true);
    try {
      await api.pollMetrics();
      await loadCampaigns();
    } catch (err) {
      setError('Poll failed');
    }
    setPolling(false);
  };

  const handleAnomaly = async (type: string) => {
    if (!selectedId) return;
    await api.injectAnomaly(selectedId, type);
    await handlePoll();
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedId);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <img src="/logo.png" alt="ABB" className="header-logo" />
          <h1>AdsButBetter</h1>
          <span className="header-subtitle">Ad Operations Dashboard</span>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={handlePoll} disabled={polling}>
            {polling ? 'Polling...' : 'Poll Metrics'}
          </button>
        </div>
      </header>

      {error && <div className="error-bar">{error}</div>}

      <main className="main">
        <section className="campaigns-section">
          <div className="section-header">
            <h2>Campaigns</h2>
            <span className="text-secondary">{campaigns.length} total</span>
          </div>
          <div className="table-wrap">
            <table className="campaigns-table">
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
                {campaigns.map(c => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    metrics={latestMetrics[c.id] || null}
                    selected={selectedId === c.id}
                    onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedCampaign && (
          <section className="detail-section">
            <div className="section-header">
              <h2>Campaign Detail</h2>
              <div className="anomaly-controls">
                <span className="text-secondary">Inject Anomaly:</span>
                <button className="btn btn-sm btn-danger" onClick={() => handleAnomaly('spike_cpl')}>Spike CPL</button>
                <button className="btn btn-sm btn-warning" onClick={() => handleAnomaly('zero_leads')}>Zero Leads</button>
                <button className="btn btn-sm btn-secondary" onClick={() => handleAnomaly('zero_impressions')}>Zero Impr</button>
                <button className="btn btn-sm btn-warning" onClick={() => handleAnomaly('budget_blowout')}>Budget Blowout</button>
              </div>
            </div>
            <CampaignDetail campaign={selectedCampaign} metrics={detailMetrics} />
          </section>
        )}
      </main>
    </div>
  );
}
