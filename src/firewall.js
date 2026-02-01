const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('firewall')
    .setDescription('Estado del sistema Firewall'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🛡️ Firewall Status')
      .addFields(
        { name: 'Anti-Nuke', value: '✅ Activo', inline: true },
        { name: 'Lockdown', value: '✅ Operativo', inline: true },
        { name: 'Auto-Unlock', value: '✅ Activo', inline: true },
        {
          name: 'Whitelist',
          value: (process.env.WHITELIST_ADMINS || 'Vacía')
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
