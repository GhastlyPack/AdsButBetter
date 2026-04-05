import { useState, useEffect } from 'react';
import { api, OverviewStats } from '../api';

const ACTION_LABELS: Record<string, string> = {
  pause_campaign: 'Pause',
  start_campaign: 'Start',
  increase_budget: 'Budget +',
  decrease_budget: 'Budget -',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--orange)',
  approved: 'var(--green)',
  denied: 'var(--red)',
  executed: 'var(--blue)',
  expired: 'var(--text-secondary)',
};

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function OverviewPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    const load = () => api.getOverview().then(setStats).catch(() => {});
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div className="text-secondary">Loading...</div>;

  const { campaigns, metrics, pendingActions, topCampaigns, recentActions } = stats;

  return (
    <div>
      <div className="stats-row">
        <div onClick={() => onNavigate('campaigns')} style={{ cursor: 'pointer' }}>
          <StatCard
            label="Campaigns"
            value={campaigns.total.toString()}
            sub={`${campaigns.active} active, ${campaigns.paused} paused`}
          />
        </div>
        <StatCard
          label="Total Leads"
          value={metrics.totalLeads.toLocaleString()}
          sub={`$${metrics.totalSpend.toLocaleString()} spent`}
        />
        <StatCard
          label="Avg CPL"
          value={metrics.avgCpl > 0 ? `$${metrics.avgCpl.toFixed(2)}` : '-'}
          color={metrics.avgCpl > 75 ? 'var(--red)' : metrics.avgCpl > 0 ? 'var(--green)' : undefined}
        />
        <div onClick={() => onNavigate('recommendations')} style={{ cursor: 'pointer' }}>
          <StatCard
            label="Pending Actions"
            value={pendingActions.toString()}
            color={pendingActions > 0 ? 'var(--orange)' : 'var(--green)'}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div>
          <div className="section-header">
            <h2>Top Campaigns by Leads</h2>
          </div>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Leads</th>
                  <th>CPL</th>
                  <th>CTR</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map(c => (
                  <tr key={c.id} className="clickable-row" onClick={() => onNavigate('campaigns')}>
                    <td>
                      <div className="campaign-name">{c.name}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.leads}</td>
                    <td className={c.cpl > 75 ? 'text-red' : c.cpl > 0 ? 'text-green' : ''}>{c.cpl > 0 ? `$${c.cpl.toFixed(2)}` : '-'}</td>
                    <td>{(c.ctr * 100).toFixed(2)}%</td>
                  </tr>
                ))}
                {topCampaigns.length === 0 && (
                  <tr><td colSpan={4} className="text-secondary" style={{ textAlign: 'center', padding: 24 }}>No data yet. Poll metrics to generate.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="section-header">
            <h2>Recent Activity</h2>
          </div>
          <div className="card">
            {recentActions.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: 24 }}>No activity yet.</p>
            ) : (
              <div className="activity-feed">
                {recentActions.map((rec: any) => {
                  const statusColor = STATUS_COLORS[rec.status] || 'var(--text-secondary)';
                  const entityId = rec.entity_id || rec.entityId;
                  const createdAt = rec.created_at || rec.createdAt;
                  return (
                    <div key={rec.id} className="activity-item">
                      <div className="activity-dot" style={{ background: statusColor }} />
                      <div className="activity-content">
                        <div className="activity-title">
                          <strong>{ACTION_LABELS[rec.action] || rec.action}</strong>
                          <span className="text-secondary"> on {entityId}</span>
                          <span className="badge" style={{ background: statusColor + '20', color: statusColor, borderColor: statusColor + '40', marginLeft: 8 }}>
                            {rec.status}
                          </span>
                        </div>
                        <div className="activity-time">{new Date(createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
