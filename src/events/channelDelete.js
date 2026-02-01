const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { checkRateLimit } = require('../utils/redis');
const logger = require('../utils/logger');
const lockdown = require('../utils/lockdown');
const Guild = require('../models/Guild');

let lastLockdown = 0;
const LOCKDOWN_COOLDOWN = 5 * 60 * 1000; // 5 min

module.exports = {
  name: 'channelDelete',

  async execute(channel) {
    try {
      const guild = channel.guild;
      if (!guild) return;

      const guildConfig = await Guild.findOne({ guildId: guild.id });
      if (!guildConfig || !guildConfig.antiNuke?.enabled) return;

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1
      });

      const deleteLog = auditLogs.entries.first();
      if (!deleteLog) return;

      const executor = deleteLog.executor;
      if (!executor) return;

      // 🧠 WHITELIST DE ADMINS (SOLO UNA VEZ)
      const whitelist = (process.env.WHITELIST_ADMINS || '').split(',');

      if (whitelist.includes(executor.id)) {
        logger.info(`🧠 Acción permitida (whitelist): ${executor.tag}`);
        return;
      }

      // Ignorar owner y bots
      if (executor.id === guild.ownerId || executor.bot) return;

      const limit = parseInt(process.env.MAX_CHANNEL_DELETES, 10) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'channelDelete', limit);
      if (!isExceeded) return;

      logger.warn(`⚠️ Anti-Nuke: ${executor.tag} eliminó demasiados canales`);

      // 🔒 LOCKDOWN con cooldown
      if (Date.now() - lastLockdown > LOCKDOWN_COOLDOWN) {
        lastLockdown = Date.now();
        await lockdown(guild, 'Nuke detectado: eliminación masiva de canales');
      }

      // Castigo
      const member = await guild.members.fetch(executor.id);
      await member.roles.set([], 'Anti-Nuke');
      await member.timeout(
        28 * 24 * 60 * 60 * 1000,
        'Anti-Nuke: eliminación masiva de canales'
      );

      // 🚨 LOG CRÍTICO
      const logChannel = guild.channels.cache.find(
        ch => ch.name === (process.env.LOGS_CRITICOS || 'firewall-alertas')
      );

      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🚨 LOCKDOWN ACTIVADO')
          .setDescription('Eliminación masiva de canales')
          .addFields(
            { name: '👤 Atacante', value: executor.tag },
            { name: '📊 Límite', value: `${limit}` }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [embed] });
      }

    } catch (e) {
      logger.error('❌ Error en channelDelete:', e);
    }
  }
};
