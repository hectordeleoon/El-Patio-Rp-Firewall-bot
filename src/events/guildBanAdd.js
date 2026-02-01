const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { checkRateLimit } = require('../utils/redis');
const logger = require('../utils/logger');
const lockdown = require('../utils/lockdown');
const Guild = require('../models/Guild');

let lastLockdown = 0;
const LOCKDOWN_COOLDOWN = 5 * 60 * 1000;

module.exports = {
  name: 'guildBanAdd',

  async execute(ban) {
    try {
      const guild = ban.guild;
      const guildConfig = await Guild.findOne({ guildId: guild.id });
      if (!guildConfig || !guildConfig.antiNuke.enabled) return;

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 1
      });

      const banLog = auditLogs.entries.first();
      if (!banLog) return;

      const executor = banLog.executor;

      // 🧠 WHITELIST
      const whitelist = (process.env.WHITELIST_ADMINS || '').split(',');
      if (whitelist.includes(executor.id)) return;

      if (executor.id === guild.ownerId || executor.bot) return;

      const limit = parseInt(process.env.MAX_BANS) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'ban', limit);
      if (!isExceeded) return;

      if (Date.now() - lastLockdown > LOCKDOWN_COOLDOWN) {
        lastLockdown = Date.now();
        await lockdown(guild, 'Nuke detectado: baneo masivo');
      }

      const member = await guild.members.fetch(executor.id);
      await member.roles.set([], 'Anti-Nuke');
      await member.timeout(28 * 24 * 60 * 60 * 1000);

      const logChannel = guild.channels.cache.find(
        ch => ch.name === (process.env.LOGS_CRITICOS || 'firewall-alertas')
      );

      if (logChannel) {
        await logChannel.send(`🚨 **LOCKDOWN** por baneo masivo (${executor.tag})`);
      }

    } catch (e) {
      logger.error('❌ Error en guildBanAdd:', e);
    }
  }
};
