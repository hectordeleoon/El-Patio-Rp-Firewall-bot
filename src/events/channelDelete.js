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

      // 🧠 WHITELIST DE ADMINS
      const whitelist = (process.env.WHITELIST_ADMINS || '').split(',').filter(id => id.trim());
      if (whitelist.includes(executor.id)) {
        logger.info(`🧠 Acción permitida (whitelist): ${executor.tag}`);
        return;
      }

      // Ignorar owner y bots
      if (executor.id === guild.ownerId || executor.bot) return;

      const limit = parseInt(process.env.MAX_CHANNEL_DELETES, 10) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'channelDelete', limit);

      // ✅ LOG DE SEGURIDAD (siempre, aunque no exceda)
      await logger.logSeguridad({
        description: `🗑️ **Canal eliminado**\n\n` +
                     `📝 **Canal:** ${channel.name}\n` +
                     `👤 **Eliminado por:** ${executor.tag} (${executor.id})\n` +
                     `⏰ **Hora:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        fields: [
          { name: '📊 Tipo', value: channel.type.toString(), inline: true },
          { name: '📁 Categoría', value: channel.parent?.name || 'Ninguna', inline: true }
        ]
      });

      if (!isExceeded) return;

      logger.warn(`⚠️ Anti-Nuke: ${executor.tag} eliminó demasiados canales`);

      // 🔒 LOCKDOWN con cooldown
      if (Date.now() - lastLockdown > LOCKDOWN_COOLDOWN) {
        lastLockdown = Date.now();
        await lockdown(guild, 'Nuke detectado: eliminación masiva de canales');
      }

      // Castigo
      const member = await guild.members.fetch(executor.id).catch(() => null);
      if (member) {
        await member.roles.set([], 'Anti-Nuke').catch(console.error);
        await member.timeout(
          28 * 24 * 60 * 60 * 1000,
          'Anti-Nuke: eliminación masiva de canales'
        ).catch(console.error);
      }

      // 🚨 LOG CRÍTICO DE FIREWALL
      await logger.logFirewall({
        description: `🚨 **LOCKDOWN ACTIVADO**\n\n` +
                     `⚠️ **Razón:** Eliminación masiva de canales\n` +
                     `👤 **Atacante:** ${executor.tag} (${executor.id})\n` +
                     `📊 **Límite excedido:** ${limit} canales\n` +
                     `🔒 **Acción:** Timeout 28 días + Roles removidos`,
        fields: [
          { name: '🗑️ Canal eliminado', value: channel.name, inline: true },
          { name: '⏰ Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        ]
      });

      // 🔥 LOG CRÍTICO (canal adicional)
      await logger.logCritico({
        description: `🔥 **ATAQUE DETECTADO: Eliminación Masiva de Canales**\n\n` +
                     `👤 **Atacante:** ${executor.tag}\n` +
                     `🔒 **Estado:** Servidor en lockdown\n` +
                     `⏱️ **Duración:** 5 minutos`,
        fields: [
          { name: '🛡️ Sistema', value: 'Anti-Nuke Firewall', inline: true },
          { name: '📊 Acción', value: 'Lockdown automático', inline: true }
        ]
      });

    } catch (e) {
      logger.error('❌ Error en channelDelete:', e);
    }
  }
};
