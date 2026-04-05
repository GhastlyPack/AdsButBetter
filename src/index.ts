import { config } from './config';
import { initDb, closeDb } from './db';
import { initDiscord, shutdownDiscord } from './discord/bot';
import { startScheduler } from './scheduler';
import { seedMockCampaigns } from './services/data-ingestion/seed';
import { MockDataProvider } from './services/data-ingestion/mock-provider';
import { logger } from './utils/logger';

async function main() {
  logger.info('AdsButBetter starting', { env: config.nodeEnv });

  // Initialize database
  initDb();

  // Seed mock campaigns
  seedMockCampaigns();

  // Initialize data provider
  const dataProvider = new MockDataProvider();

  // Initialize Discord bot
  await initDiscord();

  // Start scheduled jobs
  startScheduler(dataProvider);

  logger.info(`AdsButBetter running on port ${config.port}`);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await shutdownDiscord();
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await shutdownDiscord();
  closeDb();
  process.exit(0);
});

main().catch((err) => {
  logger.error('Fatal error', { error: String(err) });
  process.exit(1);
});
