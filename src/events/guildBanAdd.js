const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { checkRateLimit } = require('../utils/redis');
const logger = require('../utils/logger');
const lockdown = require('../utils/lockdown'); // 🔒 NUEVO
const Guild = require('../models/Guild');

// Cache de baneos por atacante
const bannedUsersCache = new Map();

module.exports = {
  name: 'guildBanAdd',
  
  async execute(ban) {
    try {
      const guild = ban.guild;
      const guildConfig = await Guild.findOne({ guildId: guild.id });
      
      if (!guildConfig || !guildConfig.antiNuke.enabled) {
        return;
      }

      // Obtener quién ejecutó el baneo
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 1
      });

      const banLog = auditLogs.entries.first();
      if (!banLog) return;

      const executor = banLog.executor;
      
      // Ignorar owner y bots
      if (executor.id === guild.ownerId || executor.bot) {
        return;
      }

      // Guardar baneo en cache
      if (!bannedUsersCache.has(executor.id)) {
        bannedUsersCache.set(executor.id, []);
      }
      bannedUsersCache.get(executor.id).push(ban.user.id);

      // Rate limit
      const limit = parseInt(process.env.MAX_BANS) || 3;
      const isExceeded = await checkRateLimit(executor.id, 'ban', limit);

      if (isExceeded) {
        logger.warn(`⚠️ Anti-Nuke: ${executor.tag} excedió límite de baneos (${limit})`);

        // 🔒 LOCKDOWN AUTOMÁTICO
        await lockdown(guild, 'Nuke detectado: baneo masivo');

        // Revertir TODOS los baneos
        const bannedUsers = bannedUsersCache.get(executor.id) || [];

        for (const userId of bannedUsers) {
          try {
            await guild.members.unban(
              userId,
              'Anti-Nuke: Reversión automática de baneo masivo'
            );
            logger.success(`✅ Usuario ${userId} desbaneado`);
          } catch (error) {
            logger.error(`❌ No se pudo desbanear ${userId}:`, error.message);
          }
        }

        bannedUsersCache.delete(executor.id);

        // Castigar atacante
        try {
          const member = await guild.members.fetch(executor.id);

          await member.roles.set([], 'Anti-Nuke: Baneo masivo');
          await member.timeout(
            28 * 24 * 60 * 60 * 1000,
            'Anti-Nuke: Baneo masivo'
          );

          logger.success(`🔒 Atacante neutralizado: ${executor.tag}`);

          const logChannel = guild.channels.cache.find(
            ch => ch.name === (process.env.LOGS_SEGURIDAD || 'seguridad-resumen')
          );

          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('🚨 ANTI-NUKE + LOCKDOWN (BANEO MASIVO)')
              .setDescription(`**${executor.tag}** intentó un baneo masivo`)
              .addFields(
                { name: '👤 Atacante', value: `${executor.tag} (${executor.id})`, inline: true },
                { name: '📊 Baneos revertidos', value: `${bannedUsers.length}`, inline: true },
                { name: '⚠️ Límite', value: `${limit}`, inline: true },
                { name: '🔒 Acciones', value: 'Lockdown activado\nUsuarios desbaneados\nRoles removidos\nTimeout 28 días' }
              )
              .setTimestamp()
              .setFooter({ text: 'El Patio RP Firewall' });

            await logChannel.send({ embeds: [embed] });
          }

        } catch (error) {
          logger.error('❌ Error castigando atacante:', error);
        }
      }

    } catch (error) {
      logger.error('❌ Error en guildBanAdd:', error);
    }
  }
};

// Limpieza de cache cada 5 min
setInterval(() => {
  bannedUsersCache.clear();
}, 5 * 60 * 1000);
