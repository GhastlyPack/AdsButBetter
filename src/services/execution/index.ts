import { Recommendation } from '../../models';
import { campaignRepo } from '../../db/repositories/campaign.repo';
import { logger } from '../../utils/logger';

export interface ExecutionResult {
  success: boolean;
  message: string;
  executedAt: string;
}

export async function executeAction(recommendation: Recommendation | Record<string, any>): Promise<ExecutionResult> {
  const rec = recommendation as any;
  const action = rec.action;
  const entityId = rec.entityId || rec.entity_id;
  const actionParams = (typeof rec.actionParams === 'string'
    ? JSON.parse(rec.actionParams)
    : typeof rec.action_params === 'string'
    ? JSON.parse(rec.action_params)
    : rec.actionParams || rec.action_params || {}) as Record<string, number>;

  const campaign = campaignRepo.findById(entityId);
  if (!campaign) {
    return { success: false, message: `Campaign ${entityId} not found`, executedAt: new Date().toISOString() };
  }

  try {
    switch (action) {
      case 'pause_campaign': {
        campaignRepo.updateStatus(entityId, 'paused');
        const msg = `Paused campaign "${campaign.name}"`;
        logger.info(msg, { entityId });
        return { success: true, message: msg, executedAt: new Date().toISOString() };
      }

      case 'start_campaign': {
        campaignRepo.updateStatus(entityId, 'active');
        const msg = `Started campaign "${campaign.name}"`;
        logger.info(msg, { entityId });
        return { success: true, message: msg, executedAt: new Date().toISOString() };
      }

      case 'increase_budget': {
        const pct = actionParams.percentage || 15;
        const newBudget = Math.round(campaign.dailyBudget * (1 + pct / 100) * 100) / 100;
        campaignRepo.updateBudget(entityId, newBudget);
        const msg = `Increased budget for "${campaign.name}" by ${pct}%: $${campaign.dailyBudget} → $${newBudget}`;
        logger.info(msg, { entityId, oldBudget: campaign.dailyBudget, newBudget });
        return { success: true, message: msg, executedAt: new Date().toISOString() };
      }

      case 'decrease_budget': {
        const pct = actionParams.percentage || 15;
        const newBudget = Math.round(campaign.dailyBudget * (1 - pct / 100) * 100) / 100;
        campaignRepo.updateBudget(entityId, Math.max(newBudget, 1)); // Never go below $1
        const msg = `Decreased budget for "${campaign.name}" by ${pct}%: $${campaign.dailyBudget} → $${newBudget}`;
        logger.info(msg, { entityId, oldBudget: campaign.dailyBudget, newBudget });
        return { success: true, message: msg, executedAt: new Date().toISOString() };
      }

      default:
        return { success: false, message: `Unknown action: ${action}`, executedAt: new Date().toISOString() };
    }
  } catch (err) {
    logger.error('Action execution failed', { error: String(err), entityId, action });
    return { success: false, message: String(err), executedAt: new Date().toISOString() };
  }
}
