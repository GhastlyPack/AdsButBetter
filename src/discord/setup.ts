import {
  ChannelType,
  EmbedBuilder,
  Guild,
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

  let category = guild.channels.cache.find(
    c => c.name === 'AdsButBetter' && c.type === ChannelType.GuildCategory
  );
  if (!category) {
    category = await guild.channels.create({
      name: 'AdsButBetter',
      type: ChannelType.GuildCategory,
      reason: 'AdsButBetter bot channels',
    });
  }

  const alertsChannel = await ensureChannel(guild, 'alerts', category.id, 'Action recommendations — approve or deny with buttons');
  const logsChannel = await ensureChannel(guild, 'logs', category.id, 'System logs and decision history');
  const rulesChannel = await ensureChannel(guild, 'rules', category.id, 'Rule engine reference');
  const helpChannel = await ensureChannel(guild, 'help', category.id, 'Getting started with AdsButBetter');
  const aiChatChannel = await ensureChannel(guild, 'ai-chat', category.id, '@mention the bot or use /ask');
  const suggestionsChannel = await ensureChannel(guild, 'rule-suggestions', category.id, 'AI-suggested rules for approval');
  const warningsChannel = await ensureChannel(guild, 'warnings', category.id, 'Performance warnings — no action needed, just awareness');

  await postHelpMessage(helpChannel, managerRole.id);
  await postChannelInfo(alertsChannel, 'Alerts', 0xf59e0b,
    `Action recommendations from the rule engine and AI. <@&${managerRole.id}> members are pinged for each alert.`,
    [
      { name: 'How to respond', value: 'Click **Approve** to execute the action, or **Deny** to reject it. Each alert includes AI-generated reasoning and a confidence score.' },
      { name: 'What happens on approve', value: 'The action is executed immediately (budget change, pause, etc.) and logged. The embed updates to show the result.' },
    ]
  );
  await postChannelInfo(rulesChannel, 'Rule Engine', 0x44d492,
    'Rules evaluate campaign metrics and trigger actions. Two tiers: **L1 Universal** (all campaigns) and **L2 Offer-Specific** (per niche).',
    [
      { name: 'Actions', value: '`pause_campaign` · `start_campaign` · `increase_budget` · `decrease_budget` · `warn` (advisory only)' },
      { name: 'AI features', value: 'The AI generates confidence scores and reasoning for each triggered rule. It can also suggest new rules based on campaign patterns — see #rule-suggestions.' },
      { name: 'Manage', value: 'Create, edit, and delete rules at **https://app.adsbutbetter.com** → Rules' },
    ]
  );
  await postChannelInfo(logsChannel, 'System Logs', 0x7a8fa3,
    'Automated log of system activity: metric polls, rule evaluations, action executions, and decisions.',
    []
  );
  await postChannelInfo(aiChatChannel, 'AI Assistant', 0x3bb8e8,
    'Talk to the AdsButBetter AI. It has full access to your campaigns, metrics, rules, and can make changes with your confirmation.',
    [
      { name: 'How to use', value: '**@mention the bot** with a question, or use the `/ask` command.\n**Reply to the bot** to continue a conversation.' },
      { name: 'Examples', value: '`@AdsButBetter How are my campaigns performing?`\n`@AdsButBetter Which campaign has the worst CPL?`\n`@AdsButBetter Create a rule to decrease budget if CPC > $5`\n`/ask What actions are pending?`' },
      { name: 'What it can do', value: 'Query campaigns & metrics · View/edit rules · Check recommendations · Change budgets · Pause/start campaigns · Explain decisions' },
    ]
  );
  await postChannelInfo(suggestionsChannel, 'Rule Suggestions', 0x3bb8e8,
    'The AI analyzes your campaign data and suggests new rules. Click **Approve** to create the rule, or **Deny** to dismiss it.',
    [
      { name: 'How it works', value: 'Click **AI Suggest Rules** on the dashboard, or the AI will periodically analyze patterns and suggest improvements.' },
      { name: 'Approved suggestions', value: 'Become active rules immediately and show an **AI** badge in the rules list.' },
    ]
  );
  await postChannelInfo(warningsChannel, 'Warnings', 0xf59e0b,
    'Performance warnings that don\'t require action but need your attention. These are advisory alerts — the system flags potential issues for you to investigate.',
    [
      { name: 'Examples', value: 'Low conversion rates, unusual spend patterns, campaigns that might need creative refreshes or funnel fixes.' },
      { name: 'No action needed', value: 'Unlike #alerts, these don\'t have approve/deny buttons. They\'re informational — review the metrics and take action if you see fit.' },
    ]
  );

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

async function postHelpMessage(channel: TextChannel, managerRoleId: string) {
  const messages = await channel.messages.fetch({ limit: 1 });
  if (messages.size > 0) return;

  const embed = new EmbedBuilder()
    .setTitle('Welcome to AdsButBetter')
    .setColor(0x3bb8e8)
    .setDescription('AdsButBetter is an AI-powered ad operations agent that monitors Meta Ads campaigns, evaluates performance against rules, and recommends or executes optimizations.')
    .addFields(
      {
        name: 'How it works',
        value: [
          '1. Metrics are polled from Meta Ads (or mock data for testing)',
          '2. Rules evaluate metrics against thresholds (CPL, CPC, CTR, etc.)',
          '3. When rules trigger, the AI generates recommendations with confidence scores',
          '4. Recommendations are posted in **#alerts** with Approve/Deny buttons',
          '5. Approved actions execute immediately (budget changes, pauses, etc.)',
          '6. Warnings go to **#warnings** for awareness without requiring action',
          '7. The AI learns from your decisions to improve future recommendations',
        ].join('\n'),
      },
      {
        name: 'Channels',
        value: [
          '**#alerts** — Action recommendations (approve/deny)',
          '**#ai-chat** — Talk to the AI (@mention or /ask)',
          '**#rule-suggestions** — AI-suggested new rules',
          '**#warnings** — Performance advisories',
          '**#logs** — System activity log',
          '**#rules** — Rule engine reference',
        ].join('\n'),
      },
      {
        name: 'AI Assistant',
        value: '@mention the bot or use `/ask` to query campaigns, metrics, rules — or ask it to make changes.',
      },
      {
        name: 'Getting started',
        value: `Get the <@&${managerRoleId}> role to receive alert pings. Visit the dashboard at **https://app.adsbutbetter.com**`,
      },
    );

  await channel.send({ embeds: [embed] });
}

async function postChannelInfo(
  channel: TextChannel,
  title: string,
  color: number,
  description: string,
  fields: { name: string; value: string }[]
) {
  const messages = await channel.messages.fetch({ limit: 1 });
  if (messages.size > 0) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setDescription(description);

  for (const field of fields) {
    embed.addFields(field);
  }

  await channel.send({ embeds: [embed] });
}
