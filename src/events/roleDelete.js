const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { checkRateLimit } = require('../utils/redis');
const logger = require('../utils/logger');
const Guild = require('../models/Guild');

module.exports = {
  name: 'roleDelete',
  
  async execute(role) {
    try {
      const guild = role.guild;
      const guildConfig = await Guild.findOne({ guildId: guild.id });
      
      if (!guildConfig || !guildConfig.antiNuke.enabled) {
        return;
      }

      // Obtener quien eliminó el rol
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
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
      const limit = parseInt(process.env.MAX_ROLE_DELETES) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'roleDelete', limit);

      if (isExceeded) {
        logger.warn(`⚠️ Anti-Nuke activado: ${executor.tag} excedió el límite de eliminación de roles (${limit})`);

        // Intentar recrear el rol eliminado
        try {
          const roleData = {
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            permissions: role.permissions,
            mentionable: role.mentionable,
            position: role.position,
            reason: 'Anti-Nuke: Restauración automática de rol eliminado'
          };

          const recreatedRole = await guild.roles.create(roleData);
          logger.success(`✅ Rol recreado: ${recreatedRole.name}`);

        } catch (error) {
          logger.error('❌ No se pudo recrear el rol:', error.message);
        }

        // Remover permisos del atacante
        try {
          const member = await guild.members.fetch(executor.id);
          
          // Remover todos los roles
          await member.roles.set([], 'Anti-Nuke: Eliminación masiva de roles detectada');
          
          // Timeout de 28 días
          await member.timeout(28 * 24 * 60 * 60 * 1000, 'Anti-Nuke: Eliminación masiva de roles');
          
          logger.success(`✅ Permisos removidos de ${executor.tag}`);

          // Notificar en el canal de seguridad
          const logChannel = guild.channels.cache.find(
            ch => ch.name === (process.env.LOGS_SEGURIDAD || 'seguridad-resumen')
          );

          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('🚨 ANTI-NUKE ACTIVADO - ELIMINACIÓN DE ROLES')
              .setDescription(`**${executor.tag}** intentó eliminar roles masivamente`)
              .addFields(
                { name: '👤 Atacante', value: `${executor.tag} (${executor.id})`, inline: true },
                { name: '🎭 Rol eliminado', value: `@${role.name}`, inline: true },
                { name: '⚠️ Límite configurado', value: `${limit}`, inline: true },
                { name: '🔄 Acción tomada', value: '✅ Rol recreado\n🔒 Roles removidos\n⏱️ Timeout de 28 días aplicado' }
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
      logger.error('❌ Error en roleDelete:', error);
    }
  }
};
