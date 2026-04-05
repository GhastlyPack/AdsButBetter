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

const METRICS = ['spend', 'impressions', 'clicks', 'leads', 'ctr', 'cpc', 'cpl', 'registrationRate'];
const OPERATORS = ['gt', 'lt', 'gte', 'lte', 'eq'];
const ACTIONS = ['pause_campaign', 'start_campaign', 'increase_budget', 'decrease_budget'];

function RuleForm({ rule, onSave, onCancel }: {
  rule: Partial<Rule> | null;
  onSave: (rule: Partial<Rule>) => void;
  onCancel: () => void;
}) {
  const [id, setId] = useState(rule?.id || '');
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [action, setAction] = useState(rule?.action || 'pause_campaign');
  const [percentage, setPercentage] = useState(
    (rule?.actionParams as Record<string, number>)?.percentage?.toString() || ''
  );
  const [priority, setPriority] = useState(rule?.priority?.toString() || '10');
  const [cooldown, setCooldown] = useState(rule?.cooldownMinutes?.toString() || '60');
  const [conditions, setConditions] = useState<{ metric: string; operator: string; threshold: string }[]>(
    (rule?.conditions || []).map(c => ({ ...c, threshold: c.threshold.toString() }))
  );

  const isEdit = !!rule?.id;

  const addCondition = () => setConditions([...conditions, { metric: 'cpl', operator: 'gt', threshold: '' }]);
  const removeCondition = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    const ruleData: Partial<Rule> = {
      id: isEdit ? rule!.id : id || `rule-${Date.now()}`,
      name,
      description,
      action,
      actionParams: percentage ? { percentage: Number(percentage) } : {},
      priority: Number(priority),
      cooldownMinutes: Number(cooldown),
      conditions: conditions.map(c => ({ metric: c.metric, operator: c.operator, threshold: Number(c.threshold) })),
    };
    onSave(ruleData);
  };

  const showPercentage = action === 'increase_budget' || action === 'decrease_budget';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 16 }}>{isEdit ? 'Edit Rule' : 'New Rule'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {!isEdit && (
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Rule ID</label>
            <input value={id} onChange={e => setId(e.target.value)} placeholder="rule-my-rule" style={inputStyle} />
          </div>
        )}
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Rule name" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this rule does" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Action</label>
          <select value={action} onChange={e => setAction(e.target.value)} style={inputStyle}>
            {ACTIONS.map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
          </select>
        </div>
        {showPercentage && (
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Percentage</label>
            <input type="number" value={percentage} onChange={e => setPercentage(e.target.value)} placeholder="20" style={inputStyle} />
          </div>
        )}
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Priority</label>
          <input type="number" value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Cooldown (minutes)</label>
          <input type="number" value={cooldown} onChange={e => setCooldown(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Conditions (ALL must be true)</label>
          <button className="btn btn-sm btn-secondary" onClick={addCondition}>+ Add Condition</button>
        </div>
        {conditions.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <select value={c.metric} onChange={e => { const n = [...conditions]; n[i].metric = e.target.value; setConditions(n); }} style={{ ...inputStyle, flex: 1 }}>
              {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={c.operator} onChange={e => { const n = [...conditions]; n[i].operator = e.target.value; setConditions(n); }} style={{ ...inputStyle, width: 80 }}>
              {OPERATORS.map(o => <option key={o} value={o}>{OPERATOR_LABELS[o]}</option>)}
            </select>
            <input type="number" value={c.threshold} onChange={e => { const n = [...conditions]; n[i].threshold = e.target.value; setConditions(n); }} placeholder="value" style={{ ...inputStyle, width: 100 }} />
            <button className="btn btn-sm btn-danger" onClick={() => removeCondition(i)}>X</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Create Rule'}</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  fontSize: 14,
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  const load = () => api.getRules().then(setRules).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSave = async (ruleData: Partial<Rule>) => {
    if (editingRule) {
      await api.updateRule(editingRule.id, ruleData);
    } else {
      await api.createRule(ruleData);
    }
    setShowForm(false);
    setEditingRule(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteRule(id);
    load();
  };

  return (
    <div>
      <div className="section-header">
        <h2>{rules.length} Rules</h2>
        <button className="btn btn-primary" onClick={() => { setEditingRule(null); setShowForm(true); }}>+ New Rule</button>
      </div>

      {showForm && (
        <RuleForm
          rule={editingRule}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingRule(null); }}
        />
      )}

      <div className="rule-list">
        {rules.map(rule => {
          const actionLabel = ACTION_LABELS[rule.action] || rule.action;
          const params = rule.actionParams as Record<string, number>;
          const paramStr = params?.percentage ? ` (${params.percentage}%)` : '';

          return (
            <div key={rule.id} className="rule-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="rule-name">{rule.name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditingRule(rule); setShowForm(true); }}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(rule.id)}>Delete</button>
                  <span className="badge" style={{
                    background: rule.enabled ? 'var(--green)20' : 'var(--text-secondary)20',
                    color: rule.enabled ? 'var(--green)' : 'var(--text-secondary)',
                    borderColor: rule.enabled ? 'var(--green)40' : 'var(--text-secondary)40',
                  }}>
                    {rule.enabled ? 'enabled' : 'disabled'}
                  </span>
                  <span className="text-secondary" style={{ fontSize: 12 }}>P{rule.priority}</span>
                </div>
              </div>
              <div className="rule-description">{rule.description}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="text-secondary" style={{ fontSize: 12 }}>IF</span>
                {rule.conditions.map((c, i) => (
                  <span key={i} className="condition-chip">
                    {c.metric} {OPERATOR_LABELS[c.operator] || c.operator} {c.threshold}
                  </span>
                ))}
                <span className="text-secondary" style={{ fontSize: 12 }}>THEN</span>
                <span className="action-chip">{actionLabel}{paramStr}</span>
                <span className="text-secondary" style={{ fontSize: 12, marginLeft: 8 }}>{rule.cooldownMinutes}m cooldown</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
