import { ButtonInteraction, EmbedBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
import { getDiscordClient, ensureAiChatChannel } from './bot';
import { recommendationRepo } from '../db/repositories/recommendation.repo';
import { executeAction } from '../services/execution';
import { sendLogMessage } from './alerts';
import { handleAskCommand, registerSlashCommands } from './commands/ask';
import { chat } from '../services/llm/chat';
import { feedbackRepo } from '../db/repositories/feedback.repo';
import { ruleRepo } from '../db/repositories/rule.repo';
import { logger } from '../utils/logger';

// Per-user conversation history for @mention chats
const mentionSessions: Record<string, any[]> = {};

export async function registerInteractions(): Promise<void> {
  const client = getDiscordClient();

  // Register slash commands + ensure ai-chat channel
  await registerSlashCommands();
  await ensureAiChatChannel();

  // Handle @mentions and replies
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    const isMention = message.mentions.has(client.user!);
    const isReplyToBot = message.reference?.messageId
      ? (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author?.id === client.user!.id
      : false;

    if (!isMention && !isReplyToBot) return;

    // Extract the question (remove the @mention)
    const question = message.content
      .replace(new RegExp(`<@!?${client.user!.id}>`, 'g'), '')
      .trim();

    if (!question) {
      await message.reply('Ask me something! For example: *How are my campaigns performing?*');
      return;
    }

    // Show typing indicator
    if ('sendTyping' in message.channel) {
      await (message.channel as any).sendTyping();
    }

    try {
      const userId = message.author.id;
      const history = mentionSessions[userId] || [];
      const result = await chat(question, history);
      mentionSessions[userId] = result.history;

      // Keep sessions bounded
      if (result.history.length > 30) {
        mentionSessions[userId] = result.history.slice(-15);
      }

      const responseText = result.response.length > 4000
        ? result.response.substring(0, 4000) + '...'
        : result.response;

      const embed = new EmbedBuilder()
        .setDescription(responseText)
        .setColor(0x3bb8e8)
        .setFooter({ text: `Reply to continue the conversation` });

      await message.reply({ embeds: [embed] });
    } catch (err) {
      logger.error('Mention chat failed', { error: String(err) });
      await message.reply('Sorry, I ran into an error. Please try again.');
    }
  });

  client.on('interactionCreate', async (interaction) => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'ask') {
        await handleAskCommand(interaction as ChatInputCommandInteraction);
      }
      return;
    }

    if (!interaction.isButton()) return;

    // Handle rule suggestion buttons
    if (interaction.customId.startsWith('approve_suggestion_') || interaction.customId.startsWith('deny_suggestion_')) {
      const parts = interaction.customId.split('_');
      const suggestionAction = parts[0]; // approve or deny
      const suggestionId = parts.slice(2).join('_'); // everything after approve_suggestion_ or deny_suggestion_
      await handleSuggestionButton(interaction, suggestionAction as 'approve' | 'deny', suggestionId);
      return;
    }

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

async function handleSuggestionButton(
  interaction: ButtonInteraction,
  action: 'approve' | 'deny',
  suggestionId: string
): Promise<void> {
  try {
    const suggestion = feedbackRepo.findSuggestionById(suggestionId);
    if (!suggestion) {
      await interaction.reply({ content: 'Suggestion not found.', flags: 64 });
      return;
    }

    if (suggestion.status !== 'pending') {
      await interaction.reply({ content: `This suggestion has already been **${suggestion.status}**.`, flags: 64 });
      return;
    }

    const userName = interaction.user.tag;

    if (action === 'approve') {
      // Create the rule
      const now = new Date().toISOString();
      ruleRepo.upsert({
        id: `rule-${suggestion.id}`,
        name: suggestion.name,
        description: suggestion.description,
        enabled: true,
        tier: suggestion.tier as any,
        offerId: suggestion.offerId,
        entityLevel: 'campaign',
        conditions: suggestion.conditions,
        action: suggestion.action as any,
        actionParams: suggestion.actionParams,
        priority: suggestion.priority,
        cooldownMinutes: suggestion.cooldownMinutes,
        createdAt: now,
        updatedAt: now,
      });
      feedbackRepo.updateSuggestionStatus(suggestionId, 'approved', userName);

      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x22c55e)
        .addFields({ name: 'Decision', value: `**APPROVED** by ${userName} — Rule created` });

      await interaction.update({ embeds: [embed], components: [] });

      await sendLogMessage(
        'Rule Suggestion APPROVED',
        `**${suggestion.name}** was approved by ${userName} and created as a new rule.`,
        0x22c55e
      );
    } else {
      feedbackRepo.updateSuggestionStatus(suggestionId, 'denied', userName);

      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0xef4444)
        .addFields({ name: 'Decision', value: `**DENIED** by ${userName}` });

      await interaction.update({ embeds: [embed], components: [] });
    }

    logger.info('Suggestion resolved via Discord', { suggestionId, action, resolvedBy: userName });
  } catch (err) {
    logger.error('Failed to handle suggestion button', { error: String(err) });
    await interaction.reply({ content: 'An error occurred.', flags: 64 }).catch(() => {});
  }
}
