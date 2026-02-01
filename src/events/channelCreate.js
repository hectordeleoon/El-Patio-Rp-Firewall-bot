const { AuditLogEvent } = require('discord.js');
const { checkRateLimit } = require('../utils/redis');
const lockdown = require('../utils/lockdown');

module.exports = {
  name: 'channelCreate',

  async execute(channel) {
    const guild = channel.guild;
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.ChannelCreate,
      limit: 1
    });

    const log = logs.entries.first();
    if (!log) return;

    const executor = log.executor;
    const whitelist = (process.env.WHITELIST_ADMINS || '').split(',');
    if (executor.bot || executor.id === guild.ownerId) return;
    if (whitelist.includes(executor.id)) return;

    const exceeded = await checkRateLimit(executor.id, 'channelCreate', 3);
    if (exceeded) {
      await lockdown(guild, 'Creación masiva de canales');
    }
  }
};
