import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';

let client: Client;

export function getDiscordClient(): Client {
  if (!client) {
    throw new Error('Discord client not initialized. Call initDiscord() first.');
  }
  return client;
}

export async function initDiscord(): Promise<Client> {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  client.once('ready', () => {
    logger.info('Discord bot connected', { user: client.user?.tag });
  });

  if (config.discord.botToken) {
    await client.login(config.discord.botToken);
  } else {
    logger.warn('No Discord bot token configured — bot will not connect');
  }

  return client;
}

export async function shutdownDiscord(): Promise<void> {
  if (client) {
    client.destroy();
    logger.info('Discord bot disconnected');
  }
}
