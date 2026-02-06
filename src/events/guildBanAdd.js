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
      if (!guildConfig || !guildConfig.antiNuke?.enabled) return;

      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 1
      });

      const banLog = auditLogs.entries.first();
      if (!banLog) return;

      const executor = banLog.executor;
      const bannedUser = ban.user;

      // 🧠 WHITELIST
      const whitelist = (process.env.WHITELIST_ADMINS || '').split(',').filter(id => id.trim());
      if (whitelist.includes(executor.id)) {
        logger.info(`🧠 Ban permitido (whitelist): ${executor.tag} baneó a ${bannedUser.tag}`);
        
        // ✅ LOG DE BANEO NORMAL (permitido)
        await logger.logBan({
          description: `🔨 **Usuario baneado**\n\n` +
                       `👤 **Baneado:** ${bannedUser.tag} (${bannedUser.id})\n` +
                       `👮 **Baneado por:** ${executor.tag} (${executor.id})\n` +
                       `📝 **Razón:** ${banLog.reason || 'No especificada'}\n` +
                       `⏰ **Hora:** <t:${Math.floor(Date.now() / 1000)}:F>`,
          fields: [
            { name: '✅ Estado', value: 'Permitido (Whitelist)', inline: true }
          ]
        });
        return;
      }

      if (executor.id === guild.ownerId || executor.bot) return;

      const limit = parseInt(process.env.MAX_BANS) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'ban', limit);

      // ✅ LOG DE BANEO NORMAL
      await logger.logBan({
        description: `🔨 **Usuario baneado**\n\n` +
                     `👤 **Baneado:** ${bannedUser.tag} (${bannedUser.id})\n` +
                     `👮 **Baneado por:** ${executor.tag} (${executor.id})\n` +
                     `📝 **Razón:** ${banLog.reason || 'No especificada'}\n` +
                     `⏰ **Hora:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        fields: [
          { name: '📊 Límite', value: `${isExceeded ? '⚠️ EXCEDIDO' : '✅ Normal'}`, inline: true },
          { name: '🔢 Máximo', value: `${limit} baneos`, inline: true }
        ]
      });

      if (!isExceeded) return;

      logger.warn(`⚠️ Anti-Nuke: ${executor.tag} baneó demasiados usuarios`);

      // 🔒 LOCKDOWN
      if (Date.now() - lastLockdown > LOCKDOWN_COOLDOWN) {
        lastLockdown = Date.now();
        await lockdown(guild, 'Nuke detectado: baneo masivo');
      }

      // Castigo
      const member = await guild.members.fetch(executor.id).catch(() => null);
      if (member) {
        await member.roles.set([], 'Anti-Nuke').catch(console.error);
        await member.timeout(28 * 24 * 60 * 60 * 1000, 'Anti-Nuke: baneo masivo').catch(console.error);
      }

      // 🚨 LOG CRÍTICO DE FIREWALL
      await logger.logFirewall({
        description: `🚨 **LOCKDOWN ACTIVADO**\n\n` +
                     `⚠️ **Razón:** Baneo masivo detectado\n` +
                     `👤 **Atacante:** ${executor.tag} (${executor.id})\n` +
                     `📊 **Límite excedido:** ${limit} baneos\n` +
                     `🔒 **Acción:** Timeout 28 días + Roles removidos\n` +
                     `👥 **Último baneado:** ${bannedUser.tag}`,
        fields: [
          { name: '⏰ Lockdown activo', value: '5 minutos', inline: true },
          { name: '🛡️ Sistema', value: 'Anti-Nuke Firewall', inline: true }
        ]
      });

      // 🔥 LOG CRÍTICO
      await logger.logCritico({
        description: `🔥 **ATAQUE: Baneo Masivo**\n\n` +
                     `👤 **Atacante:** ${executor.tag}\n` +
                     `🔒 **Estado:** Servidor en lockdown`,
        fields: [
          { name: '📊 Baneos', value: `${limit}+`, inline: true },
          { name: '⏱️ Duración', value: '5 minutos', inline: true }
        ]
      });

    } catch (e) {
      logger.error('❌ Error en guildBanAdd:', e);
    }
  }
};
