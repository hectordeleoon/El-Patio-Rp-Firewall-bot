const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const { checkRateLimit } = require('../utils/redis');
const logger = require('../utils/logger');
const Guild = require('../models/Guild');

module.exports = {
  name: 'channelDelete',
  
  async execute(channel) {
    try {
      const guild = channel.guild;
      const guildConfig = await Guild.findOne({ guildId: guild.id });
      
      if (!guildConfig || !guildConfig.antiNuke.enabled) {
        return;
      }

      // Obtener quien eliminó el canal
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1
      });

      const deleteLog = auditLogs.entries.first();
      if (!deleteLog) return;

      const executor = deleteLog.executor;
      
      // Ignorar al bot y al owner del servidor
      if (executor.id === guild.ownerId || executor.bot) {
        return;
      }

      // Verificar límite de rate
      const limit = parseInt(process.env.MAX_CHANNEL_DELETES) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'channelDelete', limit);

      if (isExceeded) {
        logger.warn(`⚠️ Anti-Nuke activado: ${executor.tag} excedió el límite de eliminación de canales (${limit})`);

        // Intentar recrear el canal eliminado
        try {
          const channelData = {
            name: channel.name,
            type: channel.type,
            topic: channel.topic,
            nsfw: channel.nsfw,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            rateLimitPerUser: channel.rateLimitPerUser,
            position: channel.position,
            parent: channel.parent,
            permissionOverwrites: channel.permissionOverwrites.cache,
            reason: 'Anti-Nuke: Restauración automática de canal eliminado'
          };

          const recreatedChannel = await guild.channels.create(channelData);
          logger.success(`✅ Canal recreado: ${recreatedChannel.name}`);

        } catch (error) {
          logger.error('❌ No se pudo recrear el canal:', error.message);
        }

        // Remover permisos del atacante
        try {
          const member = await guild.members.fetch(executor.id);
          
          // Remover todos los roles
          await member.roles.set([], 'Anti-Nuke: Eliminación masiva de canales detectada');
          
          // Timeout de 28 días
          await member.timeout(28 * 24 * 60 * 60 * 1000, 'Anti-Nuke: Eliminación masiva de canales');
          
          logger.success(`✅ Permisos removidos de ${executor.tag}`);

          // Notificar en el canal de seguridad
          const logChannel = guild.channels.cache.find(
            ch => ch.name === (process.env.LOGS_SEGURIDAD || 'seguridad-resumen')
          );

          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('🚨 ANTI-NUKE ACTIVADO - ELIMINACIÓN DE CANALES')
              .setDescription(`**${executor.tag}** intentó eliminar canales masivamente`)
              .addFields(
                { name: '👤 Atacante', value: `${executor.tag} (${executor.id})`, inline: true },
                { name: '📺 Canal eliminado', value: `#${channel.name}`, inline: true },
                { name: '⚠️ Límite configurado', value: `${limit}`, inline: true },
                { name: '🔄 Acción tomada', value: '✅ Canal recreado\n🔒 Roles removidos\n⏱️ Timeout de 28 días aplicado' }
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
      logger.error('❌ Error en channelDelete:', error);
    }
  }
};
