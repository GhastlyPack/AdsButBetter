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

  // Auth: Auth0 if configured, otherwise fallback to password
  const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
  const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
  const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
  const AUTH0_BASE_URL = process.env.AUTH0_BASE_URL || `https://app.adsbutbetter.com`;
  const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'bowskyventures.com';
  const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '16croemer.stem@gmail.com').split(',').map(e => e.trim());

  function isEmailAllowed(email: string): boolean {
    if (ALLOWED_EMAILS.includes(email)) return true;
    const domain = email.split('@')[1] || '';
    return domain === ALLOWED_DOMAIN;
  }

  if (AUTH0_DOMAIN && AUTH0_CLIENT_ID && AUTH0_CLIENT_SECRET) {
    // Auth0 SSO
    const { auth, requiresAuth } = require('express-openid-connect');

    app.use(auth({
      authRequired: false,
      auth0Logout: true,
      secret: AUTH0_CLIENT_SECRET,
      baseURL: AUTH0_BASE_URL,
      clientID: AUTH0_CLIENT_ID,
      issuerBaseURL: `https://${AUTH0_DOMAIN}`,
      routes: {
        login: '/login',
        logout: '/logout',
        callback: '/callback',
      },
    }));

    // Auth check endpoint
    app.get('/api/auth/check', (req: any, res) => {
      if (req.oidc?.isAuthenticated()) {
        const user = req.oidc.user;
        const email = user?.email || '';

        if (!isEmailAllowed(email)) {
          res.status(403).json({
            authenticated: false,
            error: `Access restricted to @${ALLOWED_DOMAIN} accounts`,
          });
          return;
        }

        res.json({
          authenticated: true,
          user: {
            email: user.email,
            name: user.name,
            picture: user.picture,
          },
        });
      } else {
        res.status(401).json({ authenticated: false });
      }
    });

    // Protect API routes
    app.use('/api', (req: any, res, next) => {
      if (req.path.startsWith('/auth')) return next();
      // Allow admin endpoints with server secret
      if (req.headers['x-admin-key'] === 'abb-server-admin') return next();
      if (!req.oidc?.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // Check email access
      const email = req.oidc.user?.email || '';
      if (!isEmailAllowed(email)) {
        return res.status(403).json({ error: `Access restricted to @${ALLOWED_DOMAIN}` });
      }
      // Attach user info for logging
      (req as any).userEmail = email;
      (req as any).userName = req.oidc.user?.name || email;
      next();
    });

    logger.info('Auth0 SSO configured', { domain: AUTH0_DOMAIN, allowedDomain: ALLOWED_DOMAIN });
  } else {
    // Fallback: simple password auth
    const cookieParser = require('cookie-parser');
    app.use(cookieParser());

    const APP_PASSWORD = process.env.APP_PASSWORD || 'BOWSKY';

    app.post('/api/auth/login', (req, res) => {
      if (req.body.password === APP_PASSWORD) {
        res.cookie('abb_auth', 'authenticated', {
          httpOnly: true,
          maxAge: 30 * 24 * 60 * 60 * 1000,
          sameSite: 'lax',
        });
        res.json({ success: true });
      } else {
        res.status(401).json({ error: 'Wrong password' });
      }
    });

    app.get('/api/auth/check', (req: any, res) => {
      if (req.cookies?.abb_auth === 'authenticated') {
        res.json({ authenticated: true, user: { email: 'local', name: 'Local User' } });
      } else {
        res.status(401).json({ authenticated: false });
      }
    });

    app.use('/api', (req: any, res, next) => {
      if (req.path.startsWith('/auth')) return next();
      if (req.cookies?.abb_auth === 'authenticated') {
        (req as any).userEmail = 'local';
        (req as any).userName = 'Local User';
        return next();
      }
      res.status(401).json({ error: 'Unauthorized' });
    });

    logger.info('Password auth configured (Auth0 not set up)');
  }

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
    await registerInteractions();

    // Always run setup to ensure channels exist and instructions are current
    if (config.discord.guildId) {
      await setupDiscordServer(config.discord.guildId);
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
