const { ChannelType, EmbedBuilder } = require('discord.js');
const logger = require('./logger');

module.exports = async function unlock(guild, reason = 'Auto-unlock') {
  try {
    logger.info(`🔓 UNLOCK INICIADO: ${guild.name}`);

    for (const channel of guild.channels.cache.values()) {
      if (
        channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildVoice
      ) {
        try {
          await channel.permissionOverwrites.edit(
            guild.roles.everyone,
            {
              SendMessages: null,
              AddReactions: null,
              Connect: null,
              Speak: null
            },
            { reason }
          );
        } catch {}
      }
    }

    const logChannel = guild.channels.cache.find(
      ch => ch.name === (process.env.LOGS_CRITICOS || 'firewall-alertas')
    );

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🔓 LOCKDOWN DESACTIVADO')
        .setDescription('El servidor ha sido desbloqueado automáticamente')
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }

  } catch (error) {
    logger.error('❌ Error en unlock', error);
  }
};
