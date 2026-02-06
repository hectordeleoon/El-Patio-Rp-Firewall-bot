const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    try {
      const guild = member.guild;

      // Esperar un momento para que los audit logs se actualicen
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar si fue kick o salida voluntaria
      let wasKicked = false;
      let executor = null;
      let reason = null;

      try {
        const auditLogs = await guild.fetchAuditLogs({
          type: AuditLogEvent.MemberKick,
          limit: 1
        });

        const kickLog = auditLogs.entries.first();
        
        if (kickLog && kickLog.target.id === member.id && 
            (Date.now() - kickLog.createdTimestamp) < 5000) {
          wasKicked = true;
          executor = kickLog.executor;
          reason = kickLog.reason;
        }
      } catch (e) {
        // No se pudo obtener audit log
      }

      // ✅ LOG en canal LEFT
      if (wasKicked) {
        await logger.logLeave({
          description: `👢 **Miembro expulsado del servidor**\n\n` +
                       `👤 **Usuario:** ${member.user.tag} (${member.user.id})\n` +
                       `👮 **Expulsado por:** ${executor?.tag || 'Desconocido'}\n` +
                       `📝 **Razón:** ${reason || 'No especificada'}\n` +
                       `⏰ **Hora:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                       `👥 **Total miembros:** ${guild.memberCount}`,
          fields: [
            { name: '⚡ Tipo', value: '👢 Kick', inline: true },
            { name: '📅 Tiempo en servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
          ]
        });

        // ✅ LOG DE SEGURIDAD para kicks
        await logger.logSeguridad({
          description: `👢 **Kick registrado**\n\n` +
                       `👤 **Kickeado:** ${member.user.tag}\n` +
                       `👮 **Por:** ${executor?.tag || 'Desconocido'}\n` +
                       `📝 **Razón:** ${reason || 'No especificada'}`,
          fields: []
        });

      } else {
        // Salida voluntaria
        await logger.logLeave({
          description: `👋 **Miembro salió del servidor**\n\n` +
                       `👤 **Usuario:** ${member.user.tag} (${member.user.id})\n` +
                       `⏰ **Hora:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                       `👥 **Total miembros:** ${guild.memberCount}`,
          fields: [
            { name: '⚡ Tipo', value: '🚪 Salida', inline: true },
            { name: '📅 Tiempo en servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
          ]
        });
      }

      logger.info(`👋 Miembro salió: ${member.user.tag} (${wasKicked ? 'KICK' : 'VOLUNTARIO'})`);

    } catch (error) {
      logger.error('❌ Error en guildMemberRemove:', error);
    }
  }
};
