const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'roleUpdate',
  async execute(oldRole, newRole) {
    try {
      const guild = newRole.guild;

      // Detectar cambios
      const changes = [];

      if (oldRole.name !== newRole.name) {
        changes.push(`📝 **Nombre:** \`${oldRole.name}\` → \`${newRole.name}\``);
      }

      if (oldRole.color !== newRole.color) {
        changes.push(`🎨 **Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
      }

      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        changes.push(`🔐 **Permisos:** Modificados`);
      }

      if (oldRole.hoist !== newRole.hoist) {
        changes.push(`📌 **Mostrar separado:** ${oldRole.hoist ? 'Sí' : 'No'} → ${newRole.hoist ? 'Sí' : 'No'}`);
      }

      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push(`@️ **Mencionable:** ${oldRole.mentionable ? 'Sí' : 'No'} → ${newRole.mentionable ? 'Sí' : 'No'}`);
      }

      // Solo loguear si hubo cambios
      if (changes.length === 0) return;

      // Obtener quién hizo el cambio
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.RoleUpdate,
        limit: 1
      });

      const updateLog = auditLogs.entries.first();
      const executor = updateLog?.executor;

      // ✅ LOG de cambio de rol
      await logger.logRole({
        description: `👑 **Rol modificado**\n\n` +
                     `📝 **Rol:** ${newRole.name}\n` +
                     `👤 **Modificado por:** ${executor?.tag || 'Desconocido'}\n` +
                     `⏰ **Hora:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                     `**Cambios:**\n${changes.join('\n')}`,
        fields: [
          { name: '🆔 ID del rol', value: newRole.id, inline: true },
          { name: '👥 Miembros', value: `${newRole.members.size}`, inline: true }
        ]
      });

      // ✅ LOG DE SEGURIDAD si son cambios de permisos
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        await logger.logSeguridad({
          description: `🔐 **Permisos de rol modificados**\n\n` +
                       `👑 **Rol:** ${newRole.name}\n` +
                       `👤 **Por:** ${executor?.tag || 'Desconocido'}\n` +
                       `⚠️ **Tipo:** Cambio de permisos`,
          fields: [
            { name: '⚠️ Atención', value: 'Revisar permisos otorgados', inline: true }
          ]
        });
      }

      logger.info(`👑 Rol actualizado: ${newRole.name}`);

    } catch (error) {
      logger.error('❌ Error en roleUpdate:', error);
    }
  }
};
