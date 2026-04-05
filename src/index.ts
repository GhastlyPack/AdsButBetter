import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { initDb, closeDb } from './db';
import { initDiscord, shutdownDiscord } from './discord/bot';
import { registerInteractions } from './discord/interactions';
import { setupDiscordServer } from './discord/setup';
import { startScheduler } from './scheduler';
import { seedMockCampaigns } from './services/data-ingestion/seed';
import { seedDefaultRules } from './services/rule-engine/seed';
import { SwitchableDataProvider } from './services/data-ingestion/switchable-provider';
import { createApiRouter } from './api';
import { logger } from './utils/logger';

async function main() {
  logger.info('AdsButBetter starting', { env: config.nodeEnv });

  // Initialize database
  initDb();

  // Seed mock campaigns and rules
  seedMockCampaigns();
  seedDefaultRules();

  // Initialize data provider (switchable between mock and Meta)
  const dataProvider = new SwitchableDataProvider();

  // Set up Express
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API routes
  app.use('/api', createApiRouter(dataProvider));

  // Serve dashboard static files in production
  const dashboardPath = path.join(__dirname, '..', 'dashboard', 'dist');
  app.use(express.static(dashboardPath));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(dashboardPath, 'index.html'));
  });

  // Start HTTP server
  app.listen(config.port, () => {
    logger.info(`HTTP server listening on port ${config.port}`);
  });

  // Initialize Discord bot
  await initDiscord();

  if (config.discord.botToken) {
    // Register button interaction handlers
    registerInteractions();

    // Set up server structure if guild ID is configured but channels aren't
    if (config.discord.guildId && !config.discord.alertsChannelId) {
      const result = await setupDiscordServer(config.discord.guildId);
      if (result) {
        logger.info('Discord setup complete — add these to your .env:', { ...result });
      }
    }
  }

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
