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

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color = confidence >= 0.8 ? 'var(--green)' : confidence >= 0.5 ? 'var(--orange)' : 'var(--red)';
  return (
    <div className="confidence-bar">
      <div className="confidence-fill">
        <div className="confidence-fill-inner" style={{ width: `${confidence * 100}%`, background: color }} />
      </div>
      <span style={{ fontSize: 12 }}>{(confidence * 100).toFixed(0)}%</span>
    </div>
  );
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.getRecommendations().then(setRecommendations).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'deny') => {
    if (loading) return;
    setLoading(true);
    try {
      if (action === 'approve') await api.approveRecommendation(id);
      else await api.denyRecommendation(id);
      load();
    } catch {}
    setLoading(false);
  };

  const pending = recommendations.filter(r => r.status === 'pending');
  const resolved = recommendations.filter(r => r.status !== 'pending');

  return (
    <div>
      <div className="section-header">
        <h2>{pending.length} Pending Actions</h2>
        <button className="btn btn-secondary" onClick={load}>Refresh</button>
      </div>

      {pending.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-secondary">No pending recommendations. Poll metrics and inject anomalies to trigger rules.</p>
        </div>
      )}

      <div className="rec-list">
        {pending.map(rec => {
          const actionParams = typeof rec.action_params === 'string' ? JSON.parse(rec.action_params) : rec.action_params;
          const paramStr = actionParams.percentage ? ` by ${actionParams.percentage}%` : '';
          return (
            <div key={rec.id} className="rec-card" style={{ borderLeftColor: 'var(--orange)', borderLeftWidth: 3 }}>
              <div className="rec-header">
                <span className="rec-action">{ACTION_LABELS[rec.action] || rec.action}{paramStr}</span>
                <ConfidenceBar confidence={rec.confidence} />
              </div>
              <div className="rec-meta">
                <span>Entity: {rec.entity_id}</span>
                <span>{new Date(rec.created_at).toLocaleString()}</span>
              </div>
              <div className="rec-reasoning">{rec.reasoning}</div>
              <div className="rec-actions">
                <button className="btn btn-sm btn-success" onClick={() => handleAction(rec.id, 'approve')} disabled={loading}>Approve</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleAction(rec.id, 'deny')} disabled={loading}>Deny</button>
              </div>
            </div>
          );
        })}
      </div>

      {resolved.length > 0 && (
        <>
          <h2 style={{ marginTop: 32, marginBottom: 12, fontSize: 16 }}>History</h2>
          <div className="rec-list">
            {resolved.map(rec => {
              const statusColor = STATUS_COLORS[rec.status] || 'var(--text-secondary)';
              return (
                <div key={rec.id} className="rec-card" style={{ opacity: 0.7 }}>
                  <div className="rec-header">
                    <span className="rec-action">{ACTION_LABELS[rec.action] || rec.action}</span>
                    <span className="badge" style={{ background: statusColor + '20', color: statusColor, borderColor: statusColor + '40' }}>
                      {rec.status}
                    </span>
                  </div>
                  <div className="rec-meta">
                    <span>Entity: {rec.entity_id}</span>
                    <span>{new Date(rec.created_at).toLocaleString()}</span>
                    {rec.resolved_by && <span>by {rec.resolved_by}</span>}
                  </div>
                  <div className="rec-reasoning">{rec.reasoning}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
