import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    channelId: process.env.DISCORD_CHANNEL_ID || '',
  },

  scheduler: {
    metricsPollingIntervalMinutes: 5,
    ruleEvaluationIntervalMinutes: 5,
    postChangeEvaluationDelayMinutes: 30,
  },

  rules: {
    defaultCooldownMinutes: 60,
    maxBudgetChangePercent: 50,
  },
} as const;
