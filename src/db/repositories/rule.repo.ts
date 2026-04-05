import { getDb } from '../index';
import { Rule, RuleCondition } from '../../models';

interface RuleRow {
  id: string;
  name: string;
  description: string;
  enabled: number;
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
    const rows = getDb().prepare('SELECT * FROM rules ORDER BY priority DESC').all() as RuleRow[];
    return rows.map(rowToRule);
  },

  findEnabled(): Rule[] {
    const rows = getDb().prepare('SELECT * FROM rules WHERE enabled = 1 ORDER BY priority DESC').all() as RuleRow[];
    return rows.map(rowToRule);
  },

  insert(rule: Rule): void {
    getDb().prepare(`
      INSERT INTO rules (id, name, description, enabled, entity_level, conditions, action, action_params, priority, cooldown_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rule.id, rule.name, rule.description, rule.enabled ? 1 : 0,
      rule.entityLevel, JSON.stringify(rule.conditions), rule.action,
      JSON.stringify(rule.actionParams), rule.priority, rule.cooldownMinutes,
      rule.createdAt, rule.updatedAt
    );
  },

  upsert(rule: Rule): void {
    getDb().prepare(`
      INSERT INTO rules (id, name, description, enabled, entity_level, conditions, action, action_params, priority, cooldown_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, description = excluded.description, enabled = excluded.enabled,
        entity_level = excluded.entity_level, conditions = excluded.conditions, action = excluded.action,
        action_params = excluded.action_params, priority = excluded.priority, cooldown_minutes = excluded.cooldown_minutes,
        updated_at = excluded.updated_at
    `).run(
      rule.id, rule.name, rule.description, rule.enabled ? 1 : 0,
      rule.entityLevel, JSON.stringify(rule.conditions), rule.action,
      JSON.stringify(rule.actionParams), rule.priority, rule.cooldownMinutes,
      rule.createdAt, rule.updatedAt
    );
  },
};
