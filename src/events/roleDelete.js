const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { checkRateLimit } = require('../utils/redis');
const logger = require('../utils/logger');
const lockdown = require('../utils/lockdown');
const Guild = require('../models/Guild');

let lastLockdown = 0;
const LOCKDOWN_COOLDOWN = 5 * 60 * 1000;

module.exports = {
  name: 'roleDelete',

  async execute(role) {
    try {
      const guild = role.guild;
      const guildConfig = await Guild.findOne({ guildId: guild.id });
      if (!guildConfig || !guildConfig.antiNuke.enabled) return;

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1
      });

      const deleteLog = auditLogs.entries.first();
      if (!deleteLog) return;

      const executor = deleteLog.executor;

      // 🧠 WHITELIST
      const whitelist = (process.env.WHITELIST_ADMINS || '').split(',');
      if (whitelist.includes(executor.id)) return;

      if (executor.id === guild.ownerId || executor.bot) return;

      const limit = parseInt(process.env.MAX_ROLE_DELETES) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'roleDelete', limit);
      if (!isExceeded) return;

      if (Date.now() - lastLockdown > LOCKDOWN_COOLDOWN) {
        lastLockdown = Date.now();
        await lockdown(guild, 'Nuke detectado: eliminación masiva de roles');
      }

      const member = await guild.members.fetch(executor.id);
      await member.roles.set([], 'Anti-Nuke');
      await member.timeout(28 * 24 * 60 * 60 * 1000);

      const logChannel = guild.channels.cache.find(
        ch => ch.name === (process.env.LOGS_CRITICOS || 'firewall-alertas')
      );

      if (logChannel) {
        await logChannel.send(`🚨 **LOCKDOWN** por eliminación masiva de roles (${executor.tag})`);
      }

    } catch (e) {
      logger.error('❌ Error en roleDelete:', e);
    }
  }
};
