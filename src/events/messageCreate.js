const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');
const logger = require('../utils/logger');

// Cache de mensajes por usuario para detectar spam
const userMessages = new Map();

module.exports = {
  name: 'messageCreate',
  
  async execute(message) {
    // Ignorar bots y DMs
    if (message.author.bot || !message.guild) return;

    try {
      const guildConfig = await Guild.findOne({ guildId: message.guild.id });
      
      if (!guildConfig || !guildConfig.antiSpam.enabled) {
        return;
      }

      const userId = message.author.id;
      const now = Date.now();
      
      // Obtener mensajes recientes del usuario
      if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
      }
      
      const messages = userMessages.get(userId);
      
      // Limpiar mensajes antiguos (fuera de la ventana de tiempo)
      const timeWindow = parseInt(process.env.SPAM_TIME_WINDOW) || 5000;
      const recentMessages = messages.filter(timestamp => now - timestamp < timeWindow);
      
      // Agregar mensaje actual
      recentMessages.push(now);
      userMessages.set(userId, recentMessages);
      
      // Verificar si excede el límite
      const messageLimit = parseInt(process.env.SPAM_MESSAGE_LIMIT) || 5;
      
      if (recentMessages.length > messageLimit) {
        logger.warn(`⚠️ Spam detectado: ${message.author.tag} envió ${recentMessages.length} mensajes en ${timeWindow}ms`);
        
        try {
          // Aplicar timeout
          await message.member.timeout(
            10 * 60 * 1000, // 10 minutos
            `Anti-Spam: ${recentMessages.length} mensajes en ${timeWindow / 1000}s`
          );
          
          // Borrar mensajes recientes del spammer
          const channelMessages = await message.channel.messages.fetch({ limit: 50 });
          const userSpamMessages = channelMessages.filter(
            msg => msg.author.id === userId && now - msg.createdTimestamp < timeWindow
          );
          
          await message.channel.bulkDelete(userSpamMessages);
          
          // Notificar
          const logChannel = message.guild.channels.cache.find(
            ch => ch.name === (process.env.LOGS_TIMEOUT || 'TIMEOUT')
          );
          
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setColor(0xFFA500)
              .setTitle('⚠️ ANTI-SPAM ACTIVADO')
              .setDescription(`**${message.author.tag}** fue sancionado por spam`)
              .addFields(
                { name: '👤 Usuario', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: '📊 Mensajes', value: `${recentMessages.length} en ${timeWindow / 1000}s`, inline: true },
                { name: '⏱️ Sanción', value: 'Timeout de 10 minutos', inline: true }
              )
              .setTimestamp()
              .setFooter({ text: 'El Patio RP Firewall' });
            
            await logChannel.send({ embeds: [embed] });
          }
          
          // Limpiar cache del usuario
          userMessages.delete(userId);
          
          logger.success(`✅ Timeout aplicado a ${message.author.tag} por spam`);
          
        } catch (error) {
          logger.error('❌ Error al aplicar sanción por spam:', error);
        }
      }
      
    } catch (error) {
      logger.error('❌ Error en messageCreate:', error);
    }
  }
};

// Limpiar cache cada 5 minutos
setInterval(() => {
  userMessages.clear();
}, 5 * 60 * 1000);
