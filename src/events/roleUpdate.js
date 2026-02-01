const { PermissionsBitField } = require('discord.js');
const lockdown = require('../utils/lockdown');

module.exports = {
  name: 'roleUpdate',

  async execute(oldRole, newRole) {
    if (
      !oldRole.permissions.has(PermissionsBitField.Flags.Administrator) &&
      newRole.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      await lockdown(
        newRole.guild,
        'Rol modificado con permisos Administrador'
      );
    }
  }
};
