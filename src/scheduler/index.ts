import cron from 'node-cron';
import { config, runtimeSettings } from '../config';
import { DataProvider } from '../services/data-ingestion';
import { metricsRepo } from '../db/repositories/metrics.repo';
import { ruleRepo } from '../db/repositories/rule.repo';
import { recommendationRepo } from '../db/repositories/recommendation.repo';
import { evaluateRules } from '../services/rule-engine';
import { generateRecommendation } from '../services/recommendation';
import { Recommendation } from '../models';
import { randomUUID } from 'crypto';
import { sendRecommendationAlert, sendLogMessage, deleteMessages, sendWarningAlert } from '../discord/alerts';
import { isSystemEnabled } from '../api';
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
  // Expire old pending recommendations and clean up their Discord messages
  const { expired, discordMessageIds } = recommendationRepo.expirePending();
  if (expired > 0) {
    logger.info('Expired old pending recommendations', { count: expired });
    await deleteMessages(discordMessageIds);
  }

  const universalRules = ruleRepo.findUniversal();
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

    // L1: universal rules run on all campaigns
    // L2: offer-specific rules only run on campaigns assigned to that offer
    let applicableRules = [...universalRules];
    if (campaign.offerId) {
      const offerRules = ruleRepo.findByOffer(campaign.offerId);
      applicableRules = [...applicableRules, ...offerRules];
    }

    const triggered = evaluateRules(latestMetrics, applicableRules);

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

      // Handle "warn" action — advisory only, no approve/deny needed
      if (t.rule.action === 'warn') {
        const recommendation = await generateRecommendation(t, latestMetrics);
        await sendWarningAlert({
          campaignId: t.entityId,
          campaignName: campaign.name,
          title: t.rule.name,
          reasoning: recommendation.reasoning,
          metrics: {
            spend: latestMetrics.spend,
            leads: latestMetrics.leads,
            cpl: latestMetrics.cpl < 99999 ? latestMetrics.cpl : 0,
            cpc: latestMetrics.cpc,
            ctr: latestMetrics.ctr,
            registrationRate: latestMetrics.registrationRate,
          },
        });
        // Still store as a recommendation for history, but auto-mark as 'noted'
        recommendation.status = 'executed' as any;
        recommendationRepo.insert(recommendation);
        newRecommendations.push(recommendation.id);
        totalTriggered++;
        logger.info('Warning sent', { entityId: t.entityId, rule: t.rule.name });
        continue;
      }

      const recommendation = await generateRecommendation(t, latestMetrics);
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

let scheduledTasks: cron.ScheduledTask[] = [];
let currentDataProvider: DataProvider;

export function startScheduler(dataProvider: DataProvider): void {
  currentDataProvider = dataProvider;
  scheduleJobs();
}

export function restartScheduler(): void {
  // Stop existing tasks
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks = [];
  logger.info('Scheduler stopped for reconfiguration');
  scheduleJobs();
}

function scheduleJobs(): void {
  const { metricsPollingIntervalMinutes, ruleEvaluationIntervalMinutes } = runtimeSettings;

  // Poll metrics for campaigns, adsets, and ads
  const pollTask = cron.schedule(`*/${metricsPollingIntervalMinutes} * * * *`, async () => {
    if (!isSystemEnabled()) { logger.debug('System disabled, skipping poll'); return; }
    try {
      logger.info('Job: polling metrics');
      const campaignSnaps = await currentDataProvider.fetchAllMetrics();
      for (const snapshot of campaignSnaps) {
        metricsRepo.insert(snapshot);
      }

      // Poll adsets and ads if available (mock provider)
      const provider: any = currentDataProvider;
      let adsetCount = 0;
      let adCount = 0;
      if (typeof provider.fetchAllAdSetMetrics === 'function') {
        const adsetSnaps = await provider.fetchAllAdSetMetrics();
        for (const s of adsetSnaps) metricsRepo.insert(s);
        adsetCount = adsetSnaps.length;
      }
      if (typeof provider.fetchAllAdMetrics === 'function') {
        const adSnaps = await provider.fetchAllAdMetrics();
        for (const s of adSnaps) metricsRepo.insert(s);
        adCount = adSnaps.length;
      }
      logger.info('Metrics polled', { campaigns: campaignSnaps.length, adsets: adsetCount, ads: adCount });
    } catch (err) {
      logger.error('Metrics polling failed', { error: String(err) });
    }
  });
  scheduledTasks.push(pollTask);

  // Evaluate rules
  const evalTask = cron.schedule(`*/${ruleEvaluationIntervalMinutes} * * * *`, async () => {
    if (!isSystemEnabled()) { logger.debug('System disabled, skipping evaluation'); return; }
    try {
      logger.info('Job: evaluating rules');
      const result = await runEvaluation();
      logger.info('Rule evaluation complete', result);
    } catch (err) {
      logger.error('Rule evaluation failed', { error: String(err) });
    }
  });
  scheduledTasks.push(evalTask);

  logger.info('Scheduler started', {
    metricsPollingIntervalMinutes,
    ruleEvaluationIntervalMinutes,
  });
}
