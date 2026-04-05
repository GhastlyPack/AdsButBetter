import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
    alertsChannelId: process.env.DISCORD_ALERTS_CHANNEL_ID || '',
    logsChannelId: process.env.DISCORD_LOGS_CHANNEL_ID || '',
    managerRoleId: process.env.DISCORD_MANAGER_ROLE_ID || '',
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
};

// Mutable runtime settings (can be changed via API)
export const runtimeSettings = {
  metricsPollingIntervalMinutes: config.scheduler.metricsPollingIntervalMinutes,
  ruleEvaluationIntervalMinutes: config.scheduler.ruleEvaluationIntervalMinutes,
  dataSource: (process.env.DATA_SOURCE || 'mock') as 'mock' | 'meta',
  metaAccessToken: process.env.META_ACCESS_TOKEN || '',
  metaAdAccountId: process.env.META_AD_ACCOUNT_ID || '',
};
