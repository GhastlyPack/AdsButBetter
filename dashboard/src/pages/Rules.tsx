import { useState, useEffect } from 'react';
import { api, Rule } from '../api';

const OPERATOR_LABELS: Record<string, string> = {
  gt: '>', lt: '<', gte: '>=', lte: '<=', eq: '=', delta_gt: 'delta >', delta_lt: 'delta <',
};

const ACTION_LABELS: Record<string, string> = {
  pause_campaign: 'Pause Campaign',
  start_campaign: 'Start Campaign',
  increase_budget: 'Increase Budget',
  decrease_budget: 'Decrease Budget',
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    api.getRules().then(setRules).catch(() => {});
  }, []);

  return (
    <div>
      <div className="section-header">
        <h2>{rules.length} Rules</h2>
      </div>

      <div className="rule-list">
        {rules.map(rule => {
          const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
          const actionParams = typeof rule.action_params === 'string' ? JSON.parse(rule.action_params) : rule.action_params;
          const actionLabel = ACTION_LABELS[rule.action] || rule.action;
          const paramStr = actionParams.percentage ? ` (${actionParams.percentage}%)` : '';

          return (
            <div key={rule.id} className="rule-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="rule-name">{rule.name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="badge" style={{
                    background: rule.enabled ? 'var(--green)20' : 'var(--text-secondary)20',
                    color: rule.enabled ? 'var(--green)' : 'var(--text-secondary)',
                    borderColor: rule.enabled ? 'var(--green)40' : 'var(--text-secondary)40',
                  }}>
                    {rule.enabled ? 'enabled' : 'disabled'}
                  </span>
                  <span className="text-secondary" style={{ fontSize: 12 }}>Priority: {rule.priority}</span>
                </div>
              </div>
              <div className="rule-description">{rule.description}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="text-secondary" style={{ fontSize: 12 }}>IF</span>
                {conditions.map((c: { metric: string; operator: string; threshold: number }, i: number) => (
                  <span key={i} className="condition-chip">
                    {c.metric} {OPERATOR_LABELS[c.operator] || c.operator} {c.threshold}
                  </span>
                ))}
                <span className="text-secondary" style={{ fontSize: 12 }}>THEN</span>
                <span className="action-chip">{actionLabel}{paramStr}</span>
                <span className="text-secondary" style={{ fontSize: 12, marginLeft: 8 }}>Cooldown: {rule.cooldown_minutes}m</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
