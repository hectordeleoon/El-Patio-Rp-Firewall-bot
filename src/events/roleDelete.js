const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { checkRateLimit } = require('../utils/redis');
const logger = require('../utils/logger');
const lockdown = require('../utils/lockdown'); // 🔒 NUEVO
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

      // Obtener quién eliminó el rol
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1
      });

      const deleteLog = auditLogs.entries.first();
      if (!deleteLog) return;

      const executor = deleteLog.executor;
      
      // Ignorar owner y bots
      if (executor.id === guild.ownerId || executor.bot) {
        return;
      }

      // Rate limit
      const limit = parseInt(process.env.MAX_ROLE_DELETES) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'roleDelete', limit);

      if (isExceeded) {
        logger.warn(`⚠️ Anti-Nuke: ${executor.tag} excedió eliminación de roles (${limit})`);

        // 🔒 LOCKDOWN AUTOMÁTICO
        await lockdown(guild, 'Nuke detectado: eliminación masiva de roles');

        // Recrear rol
        try {
          const recreatedRole = await guild.roles.create({
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            permissions: role.permissions,
            mentionable: role.mentionable,
            position: role.position,
            reason: 'Anti-Nuke: Restauración automática de rol eliminado'
          });

          logger.success(`✅ Rol recreado: ${recreatedRole.name}`);
        } catch (error) {
          logger.error('❌ No se pudo recrear el rol:', error.message);
        }

        // Castigar atacante
        try {
          const member = await guild.members.fetch(executor.id);

          await member.roles.set([], 'Anti-Nuke: Eliminación masiva de roles');
          await member.timeout(
            28 * 24 * 60 * 60 * 1000,
            'Anti-Nuke: Eliminación masiva de roles'
          );

          logger.success(`🔒 Atacante neutralizado: ${executor.tag}`);

          const logChannel = guild.channels.cache.find(
            ch => ch.name === (process.env.LOGS_SEGURIDAD || 'seguridad-resumen')
          );

          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('🚨 ANTI-NUKE + LOCKDOWN (ROLES)')
              .setDescription(`**${executor.tag}** eliminó roles masivamente`)
              .addFields(
                { name: '👤 Atacante', value: `${executor.tag} (${executor.id})`, inline: true },
                { name: '🎭 Rol', value: `@${role.name}`, inline: true },
                { name: '⚠️ Límite', value: `${limit}`, inline: true },
                { name: '🔒 Acciones', value: 'Lockdown activado\nRol recreado\nRoles removidos\nTimeout 28 días' }
              )
              .setTimestamp()
              .setFooter({ text: 'El Patio RP Firewall' });

            await logChannel.send({ embeds: [embed] });
          }

        } catch (error) {
          logger.error('❌ Error castigando atacante:', error);
        }
      }

    } catch (error) {
      logger.error('❌ Error en roleDelete:', error);
    }
  }
};
