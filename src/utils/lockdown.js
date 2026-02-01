const { PermissionsBitField } = require('discord.js');
const logger = require('./logger');

module.exports = async function lockdown(guild, reason = 'Incidente de seguridad') {
  try {
    const everyoneRole = guild.roles.everyone;

    await everyoneRole.edit({
      permissions: everyoneRole.permissions.remove([
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.CreateChannels,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageRoles,
      ])
    });

    logger.error(`🚨 LOCKDOWN ACTIVADO: ${reason}`);
    logger.error(`🔒 Servidor bloqueado temporalmente: ${guild.name}`);

  } catch (error) {
    logger.error('❌ Error activando lockdown', error);
  }
};
