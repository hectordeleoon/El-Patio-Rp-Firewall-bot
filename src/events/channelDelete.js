const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { checkRateLimit } = require('../utils/redis');
const logger = require('../utils/logger');
const lockdown = require('../utils/lockdown'); // 🔒 LOCKDOWN
const Guild = require('../models/Guild');

module.exports = {
  name: 'channelDelete',

  async execute(channel) {
    try {
      const guild = channel.guild;
      if (!guild) return;

      const guildConfig = await Guild.findOne({ guildId: guild.id });
      if (!guildConfig || !guildConfig.antiNuke?.enabled) return;

      // Obtener quién eliminó el canal
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1
      });

      const deleteLog = auditLogs.entries.first();
      if (!deleteLog) return;

      const executor = deleteLog.executor;
      if (!executor) return;

      // Ignorar owner y bots
      if (executor.id === guild.ownerId || executor.bot) return;

      // Verificar límite
      const limit = parseInt(process.env.MAX_CHANNEL_DELETES, 10) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'channelDelete', limit);

      if (!isExceeded) return;

      logger.warn(
        `⚠️ Anti-Nuke: ${executor.tag} excedió eliminación de canales (${limit})`
      );

      // 🔒 LOCKDOWN AUTOMÁTICO
      await lockdown(
        guild,
        'Nuke detectado: eliminación masiva de canales'
      );

      // Intentar recrear el canal eliminado
      try {
        await guild.channels.create({
          name: channel.name,
          type: channel.type,
          topic: channel.topic ?? null,
          nsfw: channel.nsfw ?? false,
          bitrate: channel.bitrate ?? undefined,
          userLimit: channel.userLimit ?? undefined,
          rateLimitPerUser: channel.rateLimitPerUser ?? 0,
          parent: channel.parentId ?? null,
          permissionOverwrites: channel.permissionOverwrites.cache.map(o => ({
            id: o.id,
            allow: o.allow.bitfield,
            deny: o.deny.bitfield
          })),
          reason: 'Anti-Nuke: Restauración automática de canal eliminado'
        });

        logger.success(`✅ Canal recreado: ${channel.name}`);
      } catch (error) {
        logger.error('❌ No se pudo recrear el canal:', error.message);
      }

      // Castigar atacante
      try {
        const member = await guild.members.fetch(executor.id);

        await member.roles.set([], 'Anti-Nuke: Eliminación masiva de canales');
        await member.timeout(
          28 * 24 * 60 * 60 * 1000,
          'Anti-Nuke: Eliminación masiva de canales'
        );

        logger.success(`🔒 Atacante neutralizado: ${executor.tag}`);

        // Log de seguridad
        const logChannel = guild.channels.cache.find(
          ch => ch.name === (process.env.LOGS_SEGURIDAD || 'seguridad-resumen')
        );

        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🚨 ANTI-NUKE + LOCKDOWN ACTIVADO')
            .setDescription(`**${executor.tag}** eliminó canales masivamente`)
            .addFields(
              { name: '👤 Atacante', value: `${executor.tag} (${executor.id})`, inline: true },
              { name: '📺 Canal', value: `#${channel.name}`, inline: true },
              { name: '⚠️ Límite', value: `${limit}`, inline: true },
              {
                name: '🔒 Acciones',
                value: 'Lockdown del servidor\nCanal recreado\nRoles removidos\nTimeout 28 días'
              }
            )
            .setTimestamp()
            .setFooter({ text: 'El Patio RP Firewall' });

          await logChannel.send({ embeds: [embed] });
        }
      } catch (error) {
        logger.error('❌ Error castigando atacante:', error);
      }
    } catch (error) {
      logger.error('❌ Error en channelDelete:', error);
    }
  }
};
