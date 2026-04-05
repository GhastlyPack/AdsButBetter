import { getDb } from '../index';
import { Recommendation } from '../../models';

export const recommendationRepo = {
  insert(rec: Recommendation): void {
    getDb().prepare(`
      INSERT INTO recommendations (id, entity_id, entity_level, action, action_params, confidence, reasoning, triggered_rule_ids, status, discord_message_id, created_at, resolved_at, resolved_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rec.id, rec.entityId, rec.entityLevel, rec.action,
      JSON.stringify(rec.actionParams), rec.confidence, rec.reasoning,
      JSON.stringify(rec.triggeredRuleIds), rec.status,
      rec.discordMessageId, rec.createdAt, rec.resolvedAt, rec.resolvedBy
    );
  },

  findPending(): Recommendation[] {
    return getDb().prepare(
      'SELECT * FROM recommendations WHERE status = ? ORDER BY created_at DESC'
    ).all('pending') as Recommendation[];
  },

  findRecent(limit: number = 50): Recommendation[] {
    return getDb().prepare(
      'SELECT * FROM recommendations ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as Recommendation[];
  },

  findById(id: string): Recommendation | undefined {
    return getDb().prepare(
      'SELECT * FROM recommendations WHERE id = ?'
    ).get(id) as Recommendation | undefined;
  },

  updateDiscordMessageId(id: string, messageId: string): void {
    getDb().prepare(
      'UPDATE recommendations SET discord_message_id = ? WHERE id = ?'
    ).run(messageId, id);
  },

  updateStatus(id: string, status: string, resolvedBy?: string): void {
    getDb().prepare(
      "UPDATE recommendations SET status = ?, resolved_at = datetime('now'), resolved_by = ? WHERE id = ?"
    ).run(status, resolvedBy || null, id);
  },

  findRecentForEntity(entityId: string, ruleId: string, minutesAgo: number): Recommendation | undefined {
    const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
    return getDb().prepare(`
      SELECT * FROM recommendations
      WHERE entity_id = ? AND triggered_rule_ids LIKE ? AND created_at > ?
      ORDER BY created_at DESC LIMIT 1
    `).get(entityId, `%${ruleId}%`, cutoff) as Recommendation | undefined;
  },
};
