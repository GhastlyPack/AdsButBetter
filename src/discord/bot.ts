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
    // Wait for the ready event so client.user is available
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

export async function ensureAiChatChannel(): Promise<void> {
  if (!client?.isReady() || !config.discord.guildId) return;

  try {
    const guild = await client.guilds.fetch(config.discord.guildId);
    const existing = guild.channels.cache.find(
      c => c.name === 'ai-chat' && c.type === ChannelType.GuildText
    );
    if (existing) return;

    // Find the AdsButBetter category
    const category = guild.channels.cache.find(
      c => c.name === 'AdsButBetter' && c.type === ChannelType.GuildCategory
    );

    const channel = await guild.channels.create({
      name: 'ai-chat',
      type: ChannelType.GuildText,
      parent: category?.id,
      topic: 'Chat with the AI assistant — @mention the bot or use /ask',
      reason: 'AdsButBetter AI chat channel',
    });

    // Post welcome message
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('AI Assistant')
      .setColor(0x3bb8e8)
      .setDescription('Chat with the AdsButBetter AI assistant. You can:\n\n- **@mention the bot** with a question\n- **Reply to the bot\'s messages** for follow-up\n- Use `/ask` in any channel')
      .addFields({
        name: 'Examples',
        value: [
          '`@AdsButBetter How are my campaigns performing?`',
          '`@AdsButBetter Create a rule to pause if CPL > $50`',
          '`@AdsButBetter What should I do with camp-003?`',
        ].join('\n'),
      });

    await (channel as TextChannel).send({ embeds: [embed] });
    logger.info('Created #ai-chat channel', { channelId: channel.id });
  } catch (err) {
    logger.error('Failed to create ai-chat channel', { error: String(err) });
  }
}

export async function shutdownDiscord(): Promise<void> {
  if (client) {
    client.destroy();
    logger.info('Discord bot disconnected');
  }
}
