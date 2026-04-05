import { getDb } from '../index';
import { DecisionLog } from '../../models';

export const decisionLogRepo = {
  insert(log: DecisionLog): void {
    getDb().prepare(`
      INSERT INTO decision_logs (id, recommendation_id, entity_id, entity_level, action, action_params, status, confidence, reasoning, triggered_rule_ids, resolved_by, metrics_before, metrics_after, executed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id, log.recommendationId, log.entityId, log.entityLevel,
      log.action, JSON.stringify(log.actionParams), log.status,
      log.confidence, log.reasoning, JSON.stringify(log.triggeredRuleIds),
      log.resolvedBy, JSON.stringify(log.metricsBefore),
      log.metricsAfter ? JSON.stringify(log.metricsAfter) : null,
      log.executedAt, log.createdAt
    );
  },

  findByRecommendation(recommendationId: string): DecisionLog | undefined {
    return getDb().prepare(
      'SELECT * FROM decision_logs WHERE recommendation_id = ?'
    ).get(recommendationId) as DecisionLog | undefined;
  },

  findRecent(limit: number = 50): DecisionLog[] {
    return getDb().prepare(
      'SELECT * FROM decision_logs ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as DecisionLog[];
  },
};
