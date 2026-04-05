import cron from 'node-cron';
import { config } from '../config';
import { logger } from '../utils/logger';

export function startScheduler(): void {
  const { metricsPollingIntervalMinutes, ruleEvaluationIntervalMinutes } = config.scheduler;

  // Poll metrics
  cron.schedule(`*/${metricsPollingIntervalMinutes} * * * *`, async () => {
    logger.info('Job: polling metrics');
    // TODO: Call data ingestion → store snapshots
  });

  // Evaluate rules
  cron.schedule(`*/${ruleEvaluationIntervalMinutes} * * * *`, async () => {
    logger.info('Job: evaluating rules');
    // TODO: Load latest metrics + rules → evaluate → generate recommendations → alert
  });

  logger.info('Scheduler started', {
    metricsPollingIntervalMinutes,
    ruleEvaluationIntervalMinutes,
  });
}
