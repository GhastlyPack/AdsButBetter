import { getDb } from '../index';
import { Rule, RuleCondition } from '../../models';

interface RuleRow {
  id: string;
  name: string;
  description: string;
  enabled: number;
  tier: string;
  offer_id: string | null;
  entity_level: string;
  conditions: string;
  action: string;
  action_params: string;
  priority: number;
  cooldown_minutes: number;
  created_at: string;
  updated_at: string;
}

function rowToRule(row: RuleRow): Rule {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    enabled: row.enabled === 1,
    tier: (row.tier || 'universal') as Rule['tier'],
    offerId: row.offer_id,
    entityLevel: row.entity_level as Rule['entityLevel'],
    conditions: JSON.parse(row.conditions) as RuleCondition[],
    action: row.action as Rule['action'],
    actionParams: JSON.parse(row.action_params),
    priority: row.priority,
    cooldownMinutes: row.cooldown_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ruleRepo = {
  findAll(): Rule[] {
    return (getDb().prepare('SELECT * FROM rules ORDER BY tier, priority DESC').all() as RuleRow[]).map(rowToRule);
  },

  findEnabled(): Rule[] {
    return (getDb().prepare('SELECT * FROM rules WHERE enabled = 1 ORDER BY tier, priority DESC').all() as RuleRow[]).map(rowToRule);
  },

  findUniversal(): Rule[] {
    return (getDb().prepare("SELECT * FROM rules WHERE enabled = 1 AND tier = 'universal' ORDER BY priority DESC").all() as RuleRow[]).map(rowToRule);
  },

  findByOffer(offerId: string): Rule[] {
    return (getDb().prepare("SELECT * FROM rules WHERE enabled = 1 AND tier = 'offer' AND offer_id = ? ORDER BY priority DESC").all(offerId) as RuleRow[]).map(rowToRule);
  },

  upsert(rule: Rule): void {
    getDb().prepare(`
      INSERT INTO rules (id, name, description, enabled, tier, offer_id, entity_level, conditions, action, action_params, priority, cooldown_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, description = excluded.description, enabled = excluded.enabled,
        tier = excluded.tier, offer_id = excluded.offer_id,
        entity_level = excluded.entity_level, conditions = excluded.conditions, action = excluded.action,
        action_params = excluded.action_params, priority = excluded.priority, cooldown_minutes = excluded.cooldown_minutes,
        updated_at = excluded.updated_at
    `).run(
      rule.id, rule.name, rule.description, rule.enabled ? 1 : 0,
      rule.tier || 'universal', rule.offerId || null,
      rule.entityLevel, JSON.stringify(rule.conditions), rule.action,
      JSON.stringify(rule.actionParams), rule.priority, rule.cooldownMinutes,
      rule.createdAt, rule.updatedAt
    );
  },
};
