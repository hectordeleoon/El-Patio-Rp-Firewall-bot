const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { checkRateLimit } = require('../utils/redis');
const logger = require('../utils/logger');
const Guild = require('../models/Guild');

// ✅ ARREGLO: Cache de usuarios baneados para revertir TODOS los baneos de un ataque
const bannedUsersCache = new Map(); // { executorId: [userId1, userId2, ...] }

module.exports = {
  name: 'guildBanAdd',
  
  async execute(ban) {
    try {
      const guild = ban.guild;
      const guildConfig = await Guild.findOne({ guildId: guild.id });
      
      if (!guildConfig || !guildConfig.antiNuke.enabled) {
        return;
      }

      // Obtener quien ejecutó el ban
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 1
      });

      const banLog = auditLogs.entries.first();
      if (!banLog) return;

      const executor = banLog.executor;
      
      // Ignorar al bot y al owner del servidor
      if (executor.id === guild.ownerId || executor.bot) {
        return;
      }

      // ✅ Agregar este baneo al cache del ejecutor
      if (!bannedUsersCache.has(executor.id)) {
        bannedUsersCache.set(executor.id, []);
      }
      bannedUsersCache.get(executor.id).push(ban.user.id);

      // Verificar límite de rate
      const limit = parseInt(process.env.MAX_BANS) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'ban', limit);

      if (isExceeded) {
        logger.warn(`⚠️ Anti-Nuke activado: ${executor.tag} excedió el límite de baneos (${limit})`);

        // ✅ Revertir TODOS los baneos del atacante (no solo el último)
        const bannedUsers = bannedUsersCache.get(executor.id) || [];
        
        for (const userId of bannedUsers) {
          try {
            await guild.members.unban(userId, 'Anti-Nuke: Reversión automática de baneo masivo');
            logger.success(`✅ Usuario ${userId} desbaneado automáticamente`);
          } catch (error) {
            logger.error(`❌ No se pudo desbanear a ${userId}:`, error.message);
          }
        }

        // Limpiar el cache de este ejecutor
        bannedUsersCache.delete(executor.id);

        // Remover permisos del atacante
        try {
          const member = await guild.members.fetch(executor.id);
          
          // Guardar roles actuales antes de removerlos
          const currentRoles = member.roles.cache.filter(r => r.id !== guild.id);
          
          // Remover todos los roles
          await member.roles.set([], 'Anti-Nuke: Baneo masivo detectado');
          
          // Timeout de 28 días (máximo permitido)
          await member.timeout(28 * 24 * 60 * 60 * 1000, 'Anti-Nuke: Baneo masivo detectado');
          
          logger.success(`✅ Permisos removidos de ${executor.tag}`);

          // Notificar en el canal de seguridad
          const logChannel = guild.channels.cache.find(
            ch => ch.name === (process.env.LOGS_SEGURIDAD || 'seguridad-resumen')
          );

          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('🚨 ANTI-NUKE ACTIVADO - BANEO MASIVO')
              .setDescription(`**${executor.tag}** intentó realizar un baneo masivo`)
              .addFields(
                { name: '👤 Atacante', value: `${executor.tag} (${executor.id})`, inline: true },
                { name: '📊 Baneos detectados', value: `${bannedUsers.length}`, inline: true },
                { name: '⚠️ Límite configurado', value: `${limit}`, inline: true },
                { name: '🔄 Acción tomada', value: `✅ ${bannedUsers.length} usuarios desbaneados\n🔒 Roles removidos\n⏱️ Timeout de 28 días aplicado` }
              )
              .setTimestamp()
              .setFooter({ text: 'El Patio RP Firewall' });

            await logChannel.send({ embeds: [embed] });
          }

        } catch (error) {
          logger.error('❌ Error al remover permisos del atacante:', error);
        }
      }

    } catch (error) {
      logger.error('❌ Error en guildBanAdd:', error);
    }
  }
};

// Limpiar cache cada 5 minutos para evitar acumulación
setInterval(() => {
  bannedUsersCache.clear();
}, 5 * 60 * 1000);
