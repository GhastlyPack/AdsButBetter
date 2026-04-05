import { ButtonInteraction, EmbedBuilder } from 'discord.js';
import { getDiscordClient } from './bot';
import { recommendationRepo } from '../db/repositories/recommendation.repo';
import { executeAction } from '../services/execution';
import { sendLogMessage } from './alerts';
import { logger } from '../utils/logger';

export function registerInteractions(): void {
  const client = getDiscordClient();

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, recommendationId] = interaction.customId.split('_');
    if (!action || !recommendationId) return;
    if (action !== 'approve' && action !== 'deny') return;

    await handleRecommendationButton(interaction, action, recommendationId);
  });

  logger.info('Discord button interactions registered');
}

async function handleRecommendationButton(
  interaction: ButtonInteraction,
  action: 'approve' | 'deny',
  recommendationId: string
): Promise<void> {
  try {
    const rec = recommendationRepo.findById(recommendationId);

    if (!rec) {
      await interaction.reply({ content: 'Recommendation not found.', flags: 64 });
      return;
    }

    const recAny = rec as any;
    if (recAny.status !== 'pending') {
      const resolvedBy = recAny.resolved_by || recAny.resolvedBy;
      await interaction.reply({
        content: `This recommendation has already been **${recAny.status}**${resolvedBy ? ` by ${resolvedBy}` : ''}.`,
        flags: 64,
      });
      return;
    }

    const userName = interaction.user.tag;
    let finalStatus = action === 'approve' ? 'approved' : 'denied';
    let executionMsg = '';

    recommendationRepo.updateStatus(recommendationId, finalStatus, userName);

    // If approved, execute the action
    if (action === 'approve') {
      const result = await executeAction(rec as any);
      if (result.success) {
        finalStatus = 'executed';
        recommendationRepo.updateStatus(recommendationId, 'executed', userName);
        executionMsg = `\n${result.message}`;
      } else {
        executionMsg = `\nExecution failed: ${result.message}`;
      }
    }

    // Update the original message embed
    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(action === 'approve' ? 0x22c55e : 0xef4444)
      .addFields({
        name: 'Decision',
        value: `**${finalStatus.toUpperCase()}** by ${userName}${executionMsg}`,
      });

    await interaction.update({
      embeds: [embed],
      components: [], // Remove buttons
    });

    // Log the decision
    await sendLogMessage(
      `Action ${finalStatus.toUpperCase()}`,
      `**${recAny.action}** on ${recAny.entity_id || recAny.entityId} was **${finalStatus}** by ${userName}${executionMsg}\n\nReasoning: ${recAny.reasoning}`,
      action === 'approve' ? 0x22c55e : 0xef4444
    );

    logger.info('Recommendation resolved via Discord', {
      recommendationId,
      status: finalStatus,
      resolvedBy: userName,
    });
  } catch (err) {
    logger.error('Failed to handle button interaction', { error: String(err) });
    await interaction.reply({ content: 'An error occurred processing this action.', flags: 64 }).catch(() => {});
  }
}
