const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  
  async execute(member) {
    try {
      const logChannel = member.guild.channels.cache.find(
        ch => ch.name === (process.env.LOGS_JOINS || 'JOINS')
      );

      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Nuevo Miembro')
          .setDescription(`**${member.user.tag}** se unió al servidor`)
          .addFields(
            { name: '👤 Usuario', value: `${member.user.tag}`, inline: true },
            { name: '🆔 ID', value: `${member.user.id}`, inline: true },
            { name: '📅 Cuenta creada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp()
          .setFooter({ text: 'El Patio RP Firewall' });

        await logChannel.send({ embeds: [embed] });
      }
      
      logger.info(`✅ Nuevo miembro: ${member.user.tag}`);
      
    } catch (error) {
      logger.error('❌ Error en guildMemberAdd:', error);
    }
  }
};
