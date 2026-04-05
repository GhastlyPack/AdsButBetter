import cron from 'node-cron';
import { config } from '../config';
import { DataProvider } from '../services/data-ingestion';
import { metricsRepo } from '../db/repositories/metrics.repo';
import { logger } from '../utils/logger';

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
    logger.info('Job: evaluating rules');
    // TODO: Load latest metrics + rules → evaluate → generate recommendations → alert
  });

  logger.info('Scheduler started', {
    metricsPollingIntervalMinutes,
    ruleEvaluationIntervalMinutes,
  });
}
