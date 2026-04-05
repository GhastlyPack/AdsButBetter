import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { Recommendation } from '../models';
import { getDiscordClient } from './bot';
import { config } from '../config';
import { logger } from '../utils/logger';

const ACTION_LABELS: Record<string, string> = {
  pause_campaign: 'Pause Campaign',
  start_campaign: 'Start Campaign',
  increase_budget: 'Increase Budget',
  decrease_budget: 'Decrease Budget',
};

const ACTION_COLORS: Record<string, number> = {
  pause_campaign: 0xef4444,
  start_campaign: 0x22c55e,
  increase_budget: 0x3bb8e8,
  decrease_budget: 0xf59e0b,
};

export async function sendRecommendationAlert(recommendation: Recommendation): Promise<string | null> {
  const client = getDiscordClient();
  const channelId = config.discord.alertsChannelId;
  if (!channelId) {
    logger.warn('No alerts channel configured');
    return null;
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel || !(channel instanceof TextChannel)) {
    logger.error('Alerts channel not found or not a text channel', { channelId });
    return null;
  }

  const actionLabel = ACTION_LABELS[recommendation.action] || recommendation.action;
  const actionParams = recommendation.actionParams as Record<string, number>;
  const paramStr = actionParams?.percentage ? ` by ${actionParams.percentage}%` : '';
  const confidencePercent = (recommendation.confidence * 100).toFixed(0);
  const confidenceEmoji = recommendation.confidence >= 0.9 ? '🟢' : recommendation.confidence >= 0.7 ? '🟡' : '🔴';
  const isAdDecline = recommendation.triggeredRuleIds.includes('system-ad-declined');

  const embed = new EmbedBuilder()
    .setTitle(`${isAdDecline ? '🚨 ' : ''}${actionLabel}${paramStr}`)
    .setDescription(recommendation.reasoning)
    .addFields(
      { name: 'Campaign', value: recommendation.entityId, inline: true },
      { name: 'Confidence', value: `${confidenceEmoji} ${confidencePercent}%`, inline: true },
    )
    .setColor(ACTION_COLORS[recommendation.action] || 0x3bb8e8)
    .setTimestamp()
    .setFooter({ text: `ID: ${recommendation.id.slice(0, 8)}` });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve_${recommendation.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`deny_${recommendation.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌'),
  );

  const managerRoleId = config.discord.managerRoleId;
  const pingContent = managerRoleId ? `<@&${managerRoleId}>` : '';

  const message = await channel.send({
    content: pingContent,
    embeds: [embed],
    components: [row],
  });

  logger.info('Sent recommendation alert to Discord', {
    recommendationId: recommendation.id,
    messageId: message.id,
    action: recommendation.action,
  });

  return message.id;
}

export async function deleteMessages(messageIds: string[]): Promise<void> {
  const client = getDiscordClient();
  const channelId = config.discord.alertsChannelId;
  if (!channelId || messageIds.length === 0) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) return;

    for (const msgId of messageIds) {
      try {
        const msg = await channel.messages.fetch(msgId);
        await msg.delete();
      } catch {
        // Message might already be deleted
      }
    }
    logger.info('Deleted old alert messages', { count: messageIds.length });
  } catch (err) {
    logger.error('Failed to delete messages', { error: String(err) });
  }
}

export async function sendLogMessage(title: string, description: string, color: number = 0x7a8fa3): Promise<void> {
  const client = getDiscordClient();
  const channelId = config.discord.logsChannelId;
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) return;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error('Failed to send log message', { error: String(err) });
  }
}
