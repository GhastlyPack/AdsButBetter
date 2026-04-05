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

export async function sendRecommendationAlert(recommendation: Recommendation): Promise<string | null> {
  const client = getDiscordClient();
  const channel = await client.channels.fetch(config.discord.channelId);

  if (!channel || !(channel instanceof TextChannel)) {
    logger.error('Discord channel not found or not a text channel', { channelId: config.discord.channelId });
    return null;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Recommendation: ${recommendation.action}`)
    .setDescription(recommendation.reasoning)
    .addFields(
      { name: 'Entity', value: `${recommendation.entityLevel}: ${recommendation.entityId}`, inline: true },
      { name: 'Confidence', value: `${(recommendation.confidence * 100).toFixed(0)}%`, inline: true },
      { name: 'Action Params', value: JSON.stringify(recommendation.actionParams), inline: true },
    )
    .setColor(recommendation.confidence >= 0.8 ? 0x00FF00 : 0xFFA500)
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve_${recommendation.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`deny_${recommendation.id}`)
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger),
  );

  const message = await channel.send({ embeds: [embed], components: [row] });
  logger.info('Sent recommendation alert to Discord', { recommendationId: recommendation.id, messageId: message.id });
  return message.id;
}
