import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
} from 'discord.js';
import { chat } from '../../services/llm/chat';
import { getDiscordClient } from '../bot';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// Conversation history per Discord user
const userSessions: Record<string, any[]> = {};

export const askCommand = new SlashCommandBuilder()
  .setName('ask')
  .setDescription('Ask the AI assistant about campaigns, metrics, rules, or performance')
  .addStringOption(option =>
    option.setName('question')
      .setDescription('Your question')
      .setRequired(true)
  );

export async function handleAskCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const question = interaction.options.getString('question', true);
  const userId = interaction.user.id;

  await interaction.deferReply();

  try {
    const history = userSessions[userId] || [];
    const result = await chat(question, history);
    userSessions[userId] = result.history;

    // Keep sessions bounded
    if (result.history.length > 30) {
      userSessions[userId] = result.history.slice(-15);
    }

    // Truncate for Discord embed (max 4096 chars for description)
    const responseText = result.response.length > 4000
      ? result.response.substring(0, 4000) + '...'
      : result.response;

    const embed = new EmbedBuilder()
      .setTitle('AI Assistant')
      .setDescription(responseText)
      .setColor(0x3bb8e8)
      .setFooter({ text: `Asked by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error('Ask command failed', { error: String(err) });
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Error')
          .setDescription('Failed to process your question. Please try again.')
          .setColor(0xef4444),
      ],
    });
  }
}

export async function registerSlashCommands(): Promise<void> {
  const client = getDiscordClient();
  if (!client.user) return;

  const rest = new REST().setToken(config.discord.botToken);

  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, config.discord.guildId),
      { body: [askCommand.toJSON()] }
    );
    logger.info('Registered /ask slash command');
  } catch (err) {
    logger.error('Failed to register slash commands', { error: String(err) });
  }
}
