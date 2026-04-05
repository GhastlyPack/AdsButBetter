import { useState, useEffect } from 'react';
import { api, Rule, Offer } from '../api';

const OPERATOR_LABELS: Record<string, string> = {
  gt: '>', lt: '<', gte: '>=', lte: '<=', eq: '=',
};
const ACTION_LABELS: Record<string, string> = {
  pause_campaign: 'Pause Campaign', start_campaign: 'Start Campaign',
  increase_budget: 'Increase Budget', decrease_budget: 'Decrease Budget', warn: 'Warning (Advisory)',
};
const METRICS = ['spend', 'impressions', 'clicks', 'leads', 'ctr', 'cpc', 'cpl', 'registrationRate'];
const OPERATORS = ['gt', 'lt', 'gte', 'lte', 'eq'];
const ACTIONS = ['pause_campaign', 'start_campaign', 'increase_budget', 'decrease_budget', 'warn'];

function RuleForm({ rule, offers, onSave, onCancel }: {
  rule: Partial<Rule> | null;
  offers: Offer[];
  onSave: (rule: Partial<Rule>) => void;
  onCancel: () => void;
}) {
  const [id, setId] = useState(rule?.id || '');
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [tier, setTier] = useState<'universal' | 'offer'>(rule?.tier || 'universal');
  const [offerId, setOfferId] = useState(rule?.offerId || '');
  const [action, setAction] = useState(rule?.action || 'pause_campaign');
  const [percentage, setPercentage] = useState(rule?.actionParams?.percentage?.toString() || '');
  const [priority, setPriority] = useState(rule?.priority?.toString() || '10');
  const [cooldown, setCooldown] = useState(rule?.cooldownMinutes?.toString() || '60');
  const [conditions, setConditions] = useState<{ metric: string; operator: string; threshold: string }[]>(
    (rule?.conditions || []).map(c => ({ ...c, threshold: c.threshold.toString() }))
  );
  const isEdit = !!rule?.id;
  const showPercentage = action === 'increase_budget' || action === 'decrease_budget';

  const handleSubmit = () => {
    onSave({
      id: isEdit ? rule!.id : id || `rule-${Date.now()}`,
      name, description, tier,
      offerId: tier === 'offer' ? offerId : null,
      action,
      actionParams: percentage ? { percentage: Number(percentage) } : {},
      priority: Number(priority),
      cooldownMinutes: Number(cooldown),
      conditions: conditions.map(c => ({ metric: c.metric, operator: c.operator, threshold: Number(c.threshold) })),
    });
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 16 }}>{isEdit ? 'Edit Rule' : 'New Rule'}</h3>

      {/* Tier selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className={`source-btn ${tier === 'universal' ? 'active' : ''}`} onClick={() => setTier('universal')} style={{ flex: 1 }}>
          <div className="source-btn-title">L1 — Universal</div>
          <div className="source-btn-desc">Runs on ALL campaigns</div>
        </button>
        <button className={`source-btn ${tier === 'offer' ? 'active' : ''}`} onClick={() => setTier('offer')} style={{ flex: 1 }}>
          <div className="source-btn-title">L2 — Offer Specific</div>
          <div className="source-btn-desc">Only runs on campaigns in a specific offer</div>
        </button>
      </div>

      {tier === 'offer' && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Offer</label>
          <select value={offerId} onChange={e => setOfferId(e.target.value)} style={inputStyle}>
            <option value="">Select an offer...</option>
            {offers.map(o => <option key={o.id} value={o.id}>{o.name} ({o.niche})</option>)}
          </select>
        </div>
      )}

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
          <button className="btn btn-sm btn-secondary" onClick={() => setConditions([...conditions, { metric: 'cpl', operator: 'gt', threshold: '' }])}>+ Add</button>
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
            <button className="btn btn-sm btn-danger" onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))}>X</button>
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
  width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)',
  border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14,
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [filter, setFilter] = useState<'all' | 'universal' | 'offer'>('all');
  const [generating, setGenerating] = useState(false);

  const load = () => {
    api.getRules().then(setRules).catch(() => {});
    api.getOffers().then(setOffers).catch(() => {});
    api.getPendingSuggestions().then(setSuggestions).catch(() => {});
  };
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

  const filtered = filter === 'all' ? rules : rules.filter(r => r.tier === filter);
  const offerMap = Object.fromEntries(offers.map(o => [o.id, o]));

  const handleGenerateSuggestions = async () => {
    setGenerating(true);
    try {
      await api.generateSuggestions();
      await api.getPendingSuggestions().then(setSuggestions);
    } catch {}
    setGenerating(false);
  };

  const handleApproveSuggestion = async (id: string) => {
    await api.approveSuggestion(id);
    load();
  };

  const handleDenySuggestion = async (id: string) => {
    await api.denySuggestion(id);
    load();
  };

  return (
    <div>
      <div className="section-header">
        <h2>{rules.length} Rules</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleGenerateSuggestions} disabled={generating}>
            {generating ? 'Analyzing...' : 'AI Suggest Rules'}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingRule(null); setShowForm(true); }}>+ New Rule</button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12, color: 'var(--accent)' }}>AI Suggestions ({suggestions.length})</h3>
          <div className="rule-list">
            {suggestions.map(s => (
              <div key={s.id} className="rule-card" style={{ borderLeft: '3px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge" style={{ background: 'var(--accent)20', color: 'var(--accent)', borderColor: 'var(--accent)40' }}>AI</span>
                    <div className="rule-name">{s.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-success" onClick={() => handleApproveSuggestion(s.id)}>Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDenySuggestion(s.id)}>Deny</button>
                  </div>
                </div>
                <div className="rule-description">{s.description}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>{s.reasoning}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="text-secondary" style={{ fontSize: 12 }}>IF</span>
                  {s.conditions.map((c: any, i: number) => (
                    <span key={i} className="condition-chip">
                      {c.metric} {OPERATOR_LABELS[c.operator] || c.operator} {c.threshold}
                    </span>
                  ))}
                  <span className="text-secondary" style={{ fontSize: 12 }}>THEN</span>
                  <span className="action-chip">{ACTION_LABELS[s.action] || s.action}{s.actionParams?.percentage ? ` (${s.actionParams.percentage}%)` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All ({rules.length})</button>
        <button className={`filter-tab ${filter === 'universal' ? 'active' : ''}`} onClick={() => setFilter('universal')}>L1 Universal ({rules.filter(r => r.tier === 'universal').length})</button>
        <button className={`filter-tab ${filter === 'offer' ? 'active' : ''}`} onClick={() => setFilter('offer')}>L2 Offer ({rules.filter(r => r.tier === 'offer').length})</button>
      </div>

      {showForm && (
        <RuleForm
          rule={editingRule}
          offers={offers}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingRule(null); }}
        />
      )}

      <div className="rule-list">
        {filtered.map(rule => {
          const actionLabel = ACTION_LABELS[rule.action] || rule.action;
          const params = rule.actionParams as Record<string, number>;
          const paramStr = params?.percentage ? ` (${params.percentage}%)` : '';
          const offerName = rule.offerId ? offerMap[rule.offerId]?.name : null;

          return (
            <div key={rule.id} className="rule-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge" style={{
                    background: rule.tier === 'universal' ? 'var(--blue)20' : 'var(--accent)20',
                    color: rule.tier === 'universal' ? 'var(--blue)' : 'var(--accent)',
                    borderColor: rule.tier === 'universal' ? 'var(--blue)40' : 'var(--accent)40',
                  }}>
                    {rule.tier === 'universal' ? 'L1' : 'L2'}
                  </span>
                  {rule.id.startsWith('rule-suggestion') && (
                    <span className="badge" style={{ background: 'var(--accent)20', color: 'var(--accent)', borderColor: 'var(--accent)40' }}>AI</span>
                  )}
                  <div className="rule-name">{rule.name}</div>
                  {offerName && <span className="text-secondary" style={{ fontSize: 12 }}>({offerName})</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setEditingRule(rule); setShowForm(true); }}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(rule.id)}>Delete</button>
                  <span className="badge" style={{
                    background: rule.enabled ? 'var(--green)20' : 'var(--text-secondary)20',
                    color: rule.enabled ? 'var(--green)' : 'var(--text-secondary)',
                    borderColor: rule.enabled ? 'var(--green)40' : 'var(--text-secondary)40',
                  }}>
                    {rule.enabled ? 'on' : 'off'}
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
