import {
  ChannelType,
  EmbedBuilder,
  Guild,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { getDiscordClient } from './bot';
import { logger } from '../utils/logger';

interface SetupResult {
  managerRoleId: string;
  alertsChannelId: string;
  logsChannelId: string;
}

export async function setupDiscordServer(guildId: string): Promise<SetupResult | null> {
  const client = getDiscordClient();
  const guild = await client.guilds.fetch(guildId);
  if (!guild) {
    logger.error('Guild not found', { guildId });
    return null;
  }

  logger.info('Setting up Discord server', { guild: guild.name });

  // Create Manager role if it doesn't exist
  let managerRole = guild.roles.cache.find(r => r.name === 'ABB Manager');
  if (!managerRole) {
    managerRole = await guild.roles.create({
      name: 'ABB Manager',
      color: 0x3bb8e8,
      mentionable: true,
      reason: 'AdsButBetter manager role for alert pings',
    });
    logger.info('Created Manager role', { roleId: managerRole.id });
  }

  // Create category if it doesn't exist
  let category = guild.channels.cache.find(
    c => c.name === 'AdsButBetter' && c.type === ChannelType.GuildCategory
  );
  if (!category) {
    category = await guild.channels.create({
      name: 'AdsButBetter',
      type: ChannelType.GuildCategory,
      reason: 'AdsButBetter bot channels',
    });
    logger.info('Created category', { categoryId: category.id });
  }

  // Create channels
  const alertsChannel = await ensureChannel(guild, 'alerts', category.id, 'Action recommendations that need approval or denial');
  const logsChannel = await ensureChannel(guild, 'logs', category.id, 'System logs, metric polls, and decision history');
  const rulesChannel = await ensureChannel(guild, 'rules', category.id, 'Current rule configuration reference');
  const helpChannel = await ensureChannel(guild, 'help', category.id, 'How to use AdsButBetter');
  const aiChatChannel = await ensureChannel(guild, 'ai-chat', category.id, 'Chat with the AI assistant using /ask');

  // Post welcome/instruction messages
  await postInstructions(helpChannel, managerRole.id);
  await postRulesInfo(rulesChannel);
  await postAlertsInfo(alertsChannel, managerRole.id);
  await postLogsInfo(logsChannel);
  await postAiChatInfo(aiChatChannel);

  logger.info('Discord server setup complete', {
    managerRoleId: managerRole.id,
    alertsChannelId: alertsChannel.id,
    logsChannelId: logsChannel.id,
  });

  return {
    managerRoleId: managerRole.id,
    alertsChannelId: alertsChannel.id,
    logsChannelId: logsChannel.id,
  };
}

async function ensureChannel(guild: Guild, name: string, parentId: string, topic: string): Promise<TextChannel> {
  let channel = guild.channels.cache.find(
    c => c.name === name && c.parentId === parentId && c.type === ChannelType.GuildText
  ) as TextChannel | undefined;

  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: parentId,
      topic,
      reason: 'AdsButBetter bot channel',
    }) as TextChannel;
    logger.info(`Created channel #${name}`, { channelId: channel.id });
  }

  return channel;
}

async function postInstructions(channel: TextChannel, managerRoleId: string) {
  const messages = await channel.messages.fetch({ limit: 1 });
  if (messages.size > 0) return; // Already has messages

  const embed = new EmbedBuilder()
    .setTitle('Welcome to AdsButBetter')
    .setColor(0x3bb8e8)
    .setDescription('AdsButBetter is an AI-powered ad operations agent that monitors your Meta Ads campaigns and recommends optimizations.')
    .addFields(
      {
        name: 'How it works',
        value: [
          '1. The system polls your ad metrics on a schedule',
          '2. Rules evaluate metrics against thresholds (CPL, CPC, CTR, etc.)',
          '3. When a rule triggers, a recommendation is posted in #alerts',
          '4. Managers approve or deny actions using the buttons',
          '5. Approved actions are executed and logged',
        ].join('\n'),
      },
      {
        name: 'Channels',
        value: [
          '**#alerts** — Action recommendations that need your approval',
          '**#logs** — System activity, metric snapshots, decision history',
          '**#rules** — Current rule configuration',
          '**#help** — This channel',
        ].join('\n'),
      },
      {
        name: 'Getting started',
        value: `Ask an admin to assign you the <@&${managerRoleId}> role to receive alert pings.`,
      },
      {
        name: 'Dashboard',
        value: 'View the full dashboard at **https://app.adsbutbetter.com**',
      }
    );

  await channel.send({ embeds: [embed] });
}

async function postRulesInfo(channel: TextChannel) {
  const messages = await channel.messages.fetch({ limit: 1 });
  if (messages.size > 0) return;

  const embed = new EmbedBuilder()
    .setTitle('Rule Engine')
    .setColor(0x44d492)
    .setDescription('Rules are evaluated against campaign metrics every polling cycle. When all conditions in a rule are met, a recommendation is generated.')
    .addFields(
      {
        name: 'Rule structure',
        value: '**IF** [conditions are met] **THEN** [action] with a cooldown period to prevent rapid re-firing.',
      },
      {
        name: 'Available actions',
        value: [
          '`pause_campaign` — Pause the campaign',
          '`start_campaign` — Resume a paused campaign',
          '`increase_budget` — Increase daily budget by %',
          '`decrease_budget` — Decrease daily budget by %',
        ].join('\n'),
      },
      {
        name: 'Manage rules',
        value: 'Create, edit, and delete rules from the dashboard: **https://app.adsbutbetter.com** → Rules',
      }
    );

  await channel.send({ embeds: [embed] });
}

async function postAlertsInfo(channel: TextChannel, managerRoleId: string) {
  const messages = await channel.messages.fetch({ limit: 1 });
  if (messages.size > 0) return;

  const embed = new EmbedBuilder()
    .setTitle('Alerts Channel')
    .setColor(0xf59e0b)
    .setDescription(`This channel receives action recommendations from the rule engine. <@&${managerRoleId}> members will be pinged for each alert.`)
    .addFields(
      {
        name: 'How to respond',
        value: 'Click **Approve** to execute the action, or **Deny** to reject it. Each alert shows the rule that triggered, the actual metrics, and a confidence score.',
      }
    );

  await channel.send({ embeds: [embed] });
}

async function postLogsInfo(channel: TextChannel) {
  const messages = await channel.messages.fetch({ limit: 1 });
  if (messages.size > 0) return;

  const embed = new EmbedBuilder()
    .setTitle('System Logs')
    .setColor(0x7a8fa3)
    .setDescription('This channel receives system activity logs including metric polls, rule evaluations, and action execution results.');

  await channel.send({ embeds: [embed] });
}

async function postAiChatInfo(channel: TextChannel) {
  const messages = await channel.messages.fetch({ limit: 1 });
  if (messages.size > 0) return;

  const embed = new EmbedBuilder()
    .setTitle('AI Assistant')
    .setColor(0x3bb8e8)
    .setDescription('Chat with the AdsButBetter AI assistant using the `/ask` command.')
    .addFields(
      {
        name: 'How to use',
        value: [
          '`/ask How are my campaigns performing?`',
          '`/ask Which campaign has the highest CPL?`',
          '`/ask Create a rule to pause campaigns with CPL over $50`',
          '`/ask What actions are pending?`',
        ].join('\n'),
      },
      {
        name: 'What it can do',
        value: 'Query campaigns, metrics, rules, and recommendations. It can also create/edit rules and manage campaign budgets — with your confirmation.',
      }
    );

  await channel.send({ embeds: [embed] });
}
