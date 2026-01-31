const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  
  async execute(member) {
    try {
      const logChannel = member.guild.channels.cache.find(
        ch => ch.name === (process.env.LOGS_LEFT || 'LEFT')
      );

      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Miembro Salió')
          .setDescription(`**${member.user.tag}** dejó el servidor`)
          .addFields(
            { name: '👤 Usuario', value: `${member.user.tag}`, inline: true },
            { name: '🆔 ID', value: `${member.user.id}`, inline: true },
            { name: '📅 Se unió', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Desconocido', inline: true }
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp()
          .setFooter({ text: 'El Patio RP Firewall' });

        await logChannel.send({ embeds: [embed] });
      }
      
      logger.info(`❌ Miembro salió: ${member.user.tag}`);
      
    } catch (error) {
      logger.error('❌ Error en guildMemberRemove:', error);
    }
  }
};
