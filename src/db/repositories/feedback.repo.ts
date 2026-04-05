import { getDb } from '../index';

export interface FeedbackStats {
  ruleId: string;
  totalTriggered: number;
  totalApproved: number;
  totalDenied: number;
  totalExecuted: number;
  approvalRate: number;
  lastAnalyzed: string;
}

export interface RuleSuggestion {
  id: string;
  name: string;
  description: string;
  tier: string;
  offerId: string | null;
  conditions: any[];
  action: string;
  actionParams: Record<string, number>;
  priority: number;
  cooldownMinutes: number;
  reasoning: string;
  status: string;
  suggestedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export const feedbackRepo = {
  upsertStats(stats: FeedbackStats): void {
    getDb().prepare(`
      INSERT INTO feedback_stats (rule_id, total_triggered, total_approved, total_denied, total_executed, approval_rate, last_analyzed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(rule_id) DO UPDATE SET
        total_triggered = excluded.total_triggered, total_approved = excluded.total_approved,
        total_denied = excluded.total_denied, total_executed = excluded.total_executed,
        approval_rate = excluded.approval_rate, last_analyzed = excluded.last_analyzed
    `).run(
      stats.ruleId, stats.totalTriggered, stats.totalApproved,
      stats.totalDenied, stats.totalExecuted, stats.approvalRate, stats.lastAnalyzed
    );
  },

  getStats(ruleId: string): FeedbackStats | undefined {
    const row = getDb().prepare('SELECT * FROM feedback_stats WHERE rule_id = ?').get(ruleId) as any;
    if (!row) return undefined;
    return {
      ruleId: row.rule_id,
      totalTriggered: row.total_triggered,
      totalApproved: row.total_approved,
      totalDenied: row.total_denied,
      totalExecuted: row.total_executed,
      approvalRate: row.approval_rate,
      lastAnalyzed: row.last_analyzed,
    };
  },

  getAllStats(): FeedbackStats[] {
    return (getDb().prepare('SELECT * FROM feedback_stats ORDER BY total_triggered DESC').all() as any[]).map(row => ({
      ruleId: row.rule_id,
      totalTriggered: row.total_triggered,
      totalApproved: row.total_approved,
      totalDenied: row.total_denied,
      totalExecuted: row.total_executed,
      approvalRate: row.approval_rate,
      lastAnalyzed: row.last_analyzed,
    }));
  },

  // Rule suggestions
  insertSuggestion(s: RuleSuggestion): void {
    getDb().prepare(`
      INSERT INTO rule_suggestions (id, name, description, tier, offer_id, conditions, action, action_params, priority, cooldown_minutes, reasoning, status, suggested_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      s.id, s.name, s.description, s.tier, s.offerId,
      JSON.stringify(s.conditions), s.action, JSON.stringify(s.actionParams),
      s.priority, s.cooldownMinutes, s.reasoning, s.status, s.suggestedAt
    );
  },

  getPendingSuggestions(): RuleSuggestion[] {
    return (getDb().prepare("SELECT * FROM rule_suggestions WHERE status = 'pending' ORDER BY suggested_at DESC").all() as any[]).map(mapSuggestion);
  },

  getAllSuggestions(limit: number = 20): RuleSuggestion[] {
    return (getDb().prepare('SELECT * FROM rule_suggestions ORDER BY suggested_at DESC LIMIT ?').all(limit) as any[]).map(mapSuggestion);
  },

  updateSuggestionStatus(id: string, status: string, resolvedBy?: string): void {
    getDb().prepare(
      "UPDATE rule_suggestions SET status = ?, resolved_at = datetime('now'), resolved_by = ? WHERE id = ?"
    ).run(status, resolvedBy || null, id);
  },

  findSuggestionById(id: string): RuleSuggestion | undefined {
    const row = getDb().prepare('SELECT * FROM rule_suggestions WHERE id = ?').get(id) as any;
    return row ? mapSuggestion(row) : undefined;
  },
};

function mapSuggestion(row: any): RuleSuggestion {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tier: row.tier,
    offerId: row.offer_id,
    conditions: JSON.parse(row.conditions),
    action: row.action,
    actionParams: JSON.parse(row.action_params),
    priority: row.priority,
    cooldownMinutes: row.cooldown_minutes,
    reasoning: row.reasoning,
    status: row.status,
    suggestedAt: row.suggested_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  };
}
