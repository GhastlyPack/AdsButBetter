import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { initDb, closeDb } from './db';
import { initDiscord, shutdownDiscord } from './discord/bot';
import { startScheduler } from './scheduler';
import { seedMockCampaigns } from './services/data-ingestion/seed';
import { MockDataProvider } from './services/data-ingestion/mock-provider';
import { createApiRouter } from './api';
import { logger } from './utils/logger';

async function main() {
  logger.info('AdsButBetter starting', { env: config.nodeEnv });

  // Initialize database
  initDb();

  // Seed mock campaigns
  seedMockCampaigns();

  // Initialize data provider
  const dataProvider = new MockDataProvider();

  // Set up Express
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API routes
  app.use('/api', createApiRouter(dataProvider));

  // Serve dashboard static files in production
  const dashboardPath = path.join(__dirname, '..', 'dashboard', 'dist');
  app.use(express.static(dashboardPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(dashboardPath, 'index.html'));
  });

  // Start HTTP server
  app.listen(config.port, () => {
    logger.info(`HTTP server listening on port ${config.port}`);
  });

  // Initialize Discord bot
  await initDiscord();

  // Start scheduled jobs
  startScheduler(dataProvider);

  logger.info('AdsButBetter running');
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
