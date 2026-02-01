const { PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const logger = require('./logger');

let lastLockdown = 0; // ⏱️ cooldown global

module.exports = async function lockdown(guild, reason = 'Incidente de seguridad') {
  try {
    const cooldown = parseInt(process.env.LOCKDOWN_COOLDOWN) || 300000; // 5 min
    const now = Date.now();

    // ⏱️ Evitar spam de lockdown
    if (now - lastLockdown < cooldown) {
      logger.warn('⏱️ Lockdown ignorado (cooldown activo)');
      return;
    }

    lastLockdown = now;

    logger.error(`🚨 LOCKDOWN ACTIVADO: ${reason}`);
    logger.error(`🔒 Servidor bloqueado: ${guild.name}`);

    // 🔒 Bloquear TODOS los canales (más seguro que tocar permisos globales)
    for (const channel of guild.channels.cache.values()) {
      if (
        channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildVoice
      ) {
        try {
          await channel.permissionOverwrites.edit(
            guild.roles.everyone,
            {
              SendMessages: false,
              AddReactions: false,
              Connect: false,
              Speak: false
            },
            { reason: `Lockdown automático: ${reason}` }
          );
        } catch (err) {
          // ignorar errores de canales protegidos
        }
      }
    }

    // 🚨 Log crítico
    const logChannel = guild.channels.cache.find(
      ch => ch.name === (process.env.LOGS_CRITICOS || 'firewall-alertas')
    );

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle('🚨 LOCKDOWN AUTOMÁTICO ACTIVADO')
        .setDescription('Se ha activado el **modo lockdown** por seguridad')
        .addFields(
          { name: '📍 Servidor', value: guild.name, inline: true },
          { name: '🛑 Motivo', value: reason, inline: true },
          { name: '⏱️ Cooldown', value: `${cooldown / 60000} minutos`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'El Patio RP Firewall — Sistema Crítico' });

      await logChannel.send({ embeds: [embed] });
    }

  } catch (error) {
    logger.error('❌ Error activando lockdown', error);
  }
};
