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
      if (!guildConfig || !guildConfig.antiNuke?.enabled) return;

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1
      });

      const deleteLog = auditLogs.entries.first();
      if (!deleteLog) return;

      const executor = deleteLog.executor;

      // 🧠 WHITELIST
      const whitelist = (process.env.WHITELIST_ADMINS || '').split(',').filter(id => id.trim());
      if (whitelist.includes(executor.id)) {
        logger.info(`🧠 Acción permitida (whitelist): ${executor.tag} eliminó rol ${role.name}`);
        
        // ✅ LOG NORMAL de rol eliminado
        await logger.logRole({
          description: `👑 **Rol eliminado**\n\n` +
                       `📝 **Rol:** ${role.name}\n` +
                       `👤 **Eliminado por:** ${executor.tag} (${executor.id})\n` +
                       `⏰ **Hora:** <t:${Math.floor(Date.now() / 1000)}:F>`,
          fields: [
            { name: '✅ Estado', value: 'Permitido (Whitelist)', inline: true },
            { name: '🎨 Color', value: role.hexColor, inline: true }
          ]
        });
        return;
      }

      if (executor.id === guild.ownerId || executor.bot) return;

      const limit = parseInt(process.env.MAX_ROLE_DELETES) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'roleDelete', limit);

      // ✅ LOG DE SEGURIDAD (siempre)
      await logger.logSeguridad({
        description: `🗑️ **Rol eliminado**\n\n` +
                     `📝 **Rol:** ${role.name}\n` +
                     `👤 **Eliminado por:** ${executor.tag} (${executor.id})\n` +
                     `⏰ **Hora:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        fields: [
          { name: '📊 Estado', value: isExceeded ? '⚠️ LÍMITE EXCEDIDO' : '✅ Normal', inline: true },
          { name: '🔢 Máximo', value: `${limit} roles`, inline: true }
        ]
      });

      if (!isExceeded) return;

      logger.warn(`⚠️ Anti-Nuke: ${executor.tag} eliminó demasiados roles`);

      // 🔒 LOCKDOWN
      if (Date.now() - lastLockdown > LOCKDOWN_COOLDOWN) {
        lastLockdown = Date.now();
        await lockdown(guild, 'Nuke detectado: eliminación masiva de roles');
      }

      // Castigo
      const member = await guild.members.fetch(executor.id).catch(() => null);
      if (member) {
        await member.roles.set([], 'Anti-Nuke').catch(console.error);
        await member.timeout(28 * 24 * 60 * 60 * 1000, 'Anti-Nuke: eliminación masiva de roles').catch(console.error);
      }

      // 🚨 LOG CRÍTICO DE FIREWALL
      await logger.logFirewall({
        description: `🚨 **LOCKDOWN ACTIVADO**\n\n` +
                     `⚠️ **Razón:** Eliminación masiva de roles\n` +
                     `👤 **Atacante:** ${executor.tag} (${executor.id})\n` +
                     `📊 **Límite excedido:** ${limit} roles\n` +
                     `🔒 **Acción:** Timeout 28 días + Roles removidos\n` +
                     `🗑️ **Último rol:** ${role.name}`,
        fields: [
          { name: '⏰ Lockdown activo', value: '5 minutos', inline: true },
          { name: '🛡️ Sistema', value: 'Anti-Nuke Firewall', inline: true }
        ]
      });

      // 🔥 LOG CRÍTICO
      await logger.logCritico({
        description: `🔥 **ATAQUE: Eliminación Masiva de Roles**\n\n` +
                     `👤 **Atacante:** ${executor.tag}\n` +
                     `🔒 **Estado:** Servidor en lockdown`,
        fields: [
          { name: '📊 Roles eliminados', value: `${limit}+`, inline: true },
          { name: '⏱️ Duración lockdown', value: '5 minutos', inline: true }
        ]
      });

    } catch (e) {
      logger.error('❌ Error en roleDelete:', e);
    }
  }
};
