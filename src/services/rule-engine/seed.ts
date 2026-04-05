import fs from 'fs';
import path from 'path';
import { Rule } from '../../models';
import { ruleRepo } from '../../db/repositories/rule.repo';
import { logger } from '../../utils/logger';

export function seedDefaultRules(): void {
  const rulesPath = path.join(process.cwd(), 'rules', 'default-rules.json');
  if (!fs.existsSync(rulesPath)) {
    logger.warn('No default rules file found', { path: rulesPath });
    return;
  }

  const raw = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
  const now = new Date().toISOString();
  let seeded = 0;

  for (const r of raw) {
    const rule: Rule = {
      id: r.id,
      name: r.name,
      description: r.description,
      enabled: r.enabled,
      tier: r.tier || 'universal',
      offerId: r.offerId || null,
      entityLevel: r.entityLevel,
      conditions: r.conditions,
      action: r.action,
      actionParams: r.actionParams,
      priority: r.priority,
      cooldownMinutes: r.cooldownMinutes,
      createdAt: now,
      updatedAt: now,
    };
    ruleRepo.upsert(rule);
    seeded++;
  }

  logger.info('Seeded default rules', { count: seeded });
}
