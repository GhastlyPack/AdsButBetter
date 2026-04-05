import { Client, GatewayIntentBits, ChannelType, TextChannel } from 'discord.js';
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
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
    ],
  });

  if (config.discord.botToken) {
    await client.login(config.discord.botToken);
    await new Promise<void>(resolve => {
      if (client.isReady()) {
        resolve();
      } else {
        client.once('ready', () => resolve());
      }
    });
    logger.info('Discord bot connected', { user: client.user?.tag });
  } else {
    logger.warn('No Discord bot token configured — bot will not connect');
  }

  return client;
}

export async function ensureAllChannels(): Promise<void> {
  if (!client?.isReady() || !config.discord.guildId) return;

  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    await guild.channels.fetch(); // Refresh cache

    const category = guild.channels.cache.find(
      c => c.name === 'AdsButBetter' && c.type === ChannelType.GuildCategory
    );
    const parentId = category?.id;

    const channelsToEnsure = [
      { name: 'ai-chat', topic: 'Chat with the AI assistant — @mention the bot or use /ask' },
      { name: 'rule-suggestions', topic: 'AI-suggested rules for manager approval' },
      { name: 'warnings', topic: 'Performance warnings and advisory alerts — no action required, just awareness' },
    ];

    for (const ch of channelsToEnsure) {
      const exists = guild.channels.cache.find(
        c => c.name === ch.name && c.type === ChannelType.GuildText
      );
      if (!exists) {
        const created = await guild.channels.create({
          name: ch.name,
          type: ChannelType.GuildText,
          parent: parentId,
          topic: ch.topic,
          reason: 'AdsButBetter channel',
        });
        logger.info(`Created #${ch.name} channel`, { channelId: created.id });
      }
    }
  } catch (err) {
    logger.error('Failed to ensure channels', { error: String(err) });
  }
}

export async function shutdownDiscord(): Promise<void> {
  if (client) {
    client.destroy();
    logger.info('Discord bot disconnected');
  }
}
