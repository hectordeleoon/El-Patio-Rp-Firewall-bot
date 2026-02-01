const { AuditLogEvent } = require('discord.js');
const lockdown = require('../utils/lockdown');
const logger = require('../utils/logger');

module.exports = {
  name: 'webhookCreate',

  async execute(webhook) {
    const guild = webhook.guild;
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.WebhookCreate,
      limit: 1
    });

    const log = logs.entries.first();
    if (!log) return;

    const executor = log.executor;
    const whitelist = (process.env.WHITELIST_ADMINS || '').split(',');
    if (executor.bot || executor.id === guild.ownerId) return;
    if (whitelist.includes(executor.id)) return;

    logger.warn(`🚨 Webhook sospechoso creado por ${executor.tag}`);
    await lockdown(guild, 'Creación sospechosa de webhooks');
  }
};
