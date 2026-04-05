import cron from 'node-cron';
import { config } from '../config';
import { DataProvider } from '../services/data-ingestion';
import { metricsRepo } from '../db/repositories/metrics.repo';
import { ruleRepo } from '../db/repositories/rule.repo';
import { recommendationRepo } from '../db/repositories/recommendation.repo';
import { evaluateRules } from '../services/rule-engine';
import { generateRecommendation } from '../services/recommendation';
import { Recommendation } from '../models';
import { randomUUID } from 'crypto';
import { sendRecommendationAlert, sendLogMessage } from '../discord/alerts';
import { logger } from '../utils/logger';

async function sendDiscordAlert(rec: Recommendation): Promise<void> {
  if (!config.discord.botToken || !config.discord.alertsChannelId) return;
  try {
    const messageId = await sendRecommendationAlert(rec);
    if (messageId) {
      recommendationRepo.updateDiscordMessageId(rec.id, messageId);
    }
  } catch (err) {
    logger.error('Failed to send Discord alert', { error: String(err) });
  }
}

export async function runEvaluation(): Promise<{ evaluated: number; triggered: number; recommendations: string[] }> {
  const rules = ruleRepo.findEnabled();
  const { campaignRepo } = require('../db/repositories/campaign.repo');
  const campaigns = campaignRepo.findAll();

  let totalTriggered = 0;
  const newRecommendations: string[] = [];

  for (const campaign of campaigns) {
    // Check for Meta ad decline — highest priority system check
    if (campaign.adReviewStatus === 'declined') {
      const recent = recommendationRepo.findRecentForEntity(campaign.id, 'system-ad-declined', 60);
      if (!recent) {
        const rec: Recommendation = {
          id: randomUUID(),
          entityId: campaign.id,
          entityLevel: 'campaign',
          action: 'pause_campaign',
          actionParams: {},
          confidence: 1.0,
          reasoning: `ALERT: Ad declined by Meta. Campaign "${campaign.name}" has been rejected by Meta ad review. Immediate action required.`,
          triggeredRuleIds: ['system-ad-declined'],
          status: 'pending',
          discordMessageId: null,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
          resolvedBy: null,
        };
        recommendationRepo.insert(rec);
        newRecommendations.push(rec.id);
        totalTriggered++;
        await sendDiscordAlert(rec);
        logger.warn('Ad declined by Meta', { entityId: campaign.id, name: campaign.name });
      }
      continue;
    }

    if (campaign.status !== 'active') continue;

    const latestMetrics = metricsRepo.getLatest(campaign.id);
    if (!latestMetrics) continue;

    const triggered = evaluateRules(latestMetrics, rules);

    for (const t of triggered) {
      const recent = recommendationRepo.findRecentForEntity(
        t.entityId,
        t.rule.id,
        t.rule.cooldownMinutes
      );
      if (recent) {
        logger.debug('Rule skipped (cooldown)', { ruleId: t.rule.id, entityId: t.entityId });
        continue;
      }

      const recommendation = generateRecommendation(t);
      recommendationRepo.insert(recommendation);
      newRecommendations.push(recommendation.id);
      totalTriggered++;
      await sendDiscordAlert(recommendation);

      logger.info('Recommendation created', {
        id: recommendation.id,
        entityId: recommendation.entityId,
        action: recommendation.action,
        confidence: recommendation.confidence,
        rule: t.rule.name,
      });
    }
  }

  // Send summary to logs channel
  if (totalTriggered > 0) {
    await sendLogMessage(
      'Rule Evaluation',
      `Evaluated ${campaigns.length} campaigns. **${totalTriggered}** rules triggered, ${newRecommendations.length} recommendations created.`,
      0x3bb8e8
    ).catch(() => {});
  }

  return { evaluated: campaigns.length, triggered: totalTriggered, recommendations: newRecommendations };
}

export function startScheduler(dataProvider: DataProvider): void {
  const { metricsPollingIntervalMinutes, ruleEvaluationIntervalMinutes } = config.scheduler;

  // Poll metrics
  cron.schedule(`*/${metricsPollingIntervalMinutes} * * * *`, async () => {
    try {
      logger.info('Job: polling metrics');
      const snapshots = await dataProvider.fetchAllMetrics();
      for (const snapshot of snapshots) {
        metricsRepo.insert(snapshot);
      }
      logger.info('Metrics polled', { count: snapshots.length });
    } catch (err) {
      logger.error('Metrics polling failed', { error: String(err) });
    }
  });

  // Evaluate rules
  cron.schedule(`*/${ruleEvaluationIntervalMinutes} * * * *`, async () => {
    try {
      logger.info('Job: evaluating rules');
      const result = await runEvaluation();
      logger.info('Rule evaluation complete', result);
    } catch (err) {
      logger.error('Rule evaluation failed', { error: String(err) });
    }
  });

  logger.info('Scheduler started', {
    metricsPollingIntervalMinutes,
    ruleEvaluationIntervalMinutes,
  });
}
