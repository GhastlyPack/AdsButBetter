import cron from 'node-cron';
import { config } from '../config';
import { DataProvider } from '../services/data-ingestion';
import { metricsRepo } from '../db/repositories/metrics.repo';
import { ruleRepo } from '../db/repositories/rule.repo';
import { recommendationRepo } from '../db/repositories/recommendation.repo';
import { evaluateRules } from '../services/rule-engine';
import { generateRecommendation } from '../services/recommendation';
import { logger } from '../utils/logger';

export function runEvaluation(): { evaluated: number; triggered: number; recommendations: string[] } {
  const rules = ruleRepo.findEnabled();
  const campaigns = require('../db/repositories/campaign.repo').campaignRepo.findAll();

  let totalTriggered = 0;
  const newRecommendations: string[] = [];

  for (const campaign of campaigns) {
    if (campaign.status !== 'active') continue;

    const latestMetrics = metricsRepo.getLatest(campaign.id);
    if (!latestMetrics) continue;

    const triggered = evaluateRules(latestMetrics, rules);

    for (const t of triggered) {
      // Check cooldown — skip if a recommendation for this rule+entity was made recently
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

      logger.info('Recommendation created', {
        id: recommendation.id,
        entityId: recommendation.entityId,
        action: recommendation.action,
        confidence: recommendation.confidence,
        rule: t.rule.name,
      });
    }
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
  cron.schedule(`*/${ruleEvaluationIntervalMinutes} * * * *`, () => {
    try {
      logger.info('Job: evaluating rules');
      const result = runEvaluation();
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
