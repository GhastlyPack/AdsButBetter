import { useState, useEffect } from 'react';
import { api, Recommendation } from '../api';

const ACTION_LABELS: Record<string, string> = {
  pause_campaign: 'Pause Campaign',
  start_campaign: 'Start Campaign',
  increase_budget: 'Increase Budget',
  decrease_budget: 'Decrease Budget',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--orange)',
  approved: 'var(--green)',
  denied: 'var(--red)',
  executed: 'var(--blue)',
  expired: 'var(--text-secondary)',
};

type Filter = 'all' | 'executed' | 'approved' | 'denied' | 'expired' | 'pending';

export default function HistoryPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const load = () => api.getRecommendations(100).then(setRecommendations).catch(() => {});
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'all'
    ? recommendations
    : recommendations.filter(r => r.status === filter);

  const counts: Record<string, number> = {};
  for (const r of recommendations) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${recommendations.length})` },
    { key: 'executed', label: `Executed (${counts['executed'] || 0})` },
    { key: 'approved', label: `Approved (${counts['approved'] || 0})` },
    { key: 'pending', label: `Pending (${counts['pending'] || 0})` },
    { key: 'denied', label: `Denied (${counts['denied'] || 0})` },
    { key: 'expired', label: `Expired (${counts['expired'] || 0})` },
  ];

  return (
    <div>
      <div className="section-header">
        <h2>Decision History</h2>
        <span className="text-secondary">{recommendations.length} total decisions</span>
      </div>

      <div className="filter-tabs">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Campaign</th>
              <th>Action</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Resolved By</th>
              <th>Reasoning</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((rec: any) => {
              const statusColor = STATUS_COLORS[rec.status] || 'var(--text-secondary)';
              const entityId = rec.entity_id || rec.entityId;
              const createdAt = rec.created_at || rec.createdAt;
              const resolvedBy = rec.resolved_by || rec.resolvedBy;
              const actionParams = typeof rec.action_params === 'string' ? JSON.parse(rec.action_params) : (rec.actionParams || rec.action_params || {});
              const paramStr = actionParams?.percentage ? ` (${actionParams.percentage}%)` : '';

              return (
                <tr key={rec.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{new Date(createdAt).toLocaleString()}</td>
                  <td><span className="campaign-id">{entityId}</span></td>
                  <td style={{ fontWeight: 500 }}>{ACTION_LABELS[rec.action] || rec.action}{paramStr}</td>
                  <td>
                    <span className="badge" style={{ background: statusColor + '20', color: statusColor, borderColor: statusColor + '40' }}>
                      {rec.status}
                    </span>
                  </td>
                  <td>{(rec.confidence * 100).toFixed(0)}%</td>
                  <td className="text-secondary">{resolvedBy || '-'}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {rec.reasoning}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-secondary" style={{ textAlign: 'center', padding: 40 }}>
                  No decisions found{filter !== 'all' ? ` with status "${filter}"` : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
