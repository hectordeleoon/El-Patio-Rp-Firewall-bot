const { Events } = require('discord.js');
const logger = require('../utils/logger');

// Mapa de mensajes por usuario para detectar spam
const userMessages = new Map();
const SPAM_LIMIT = parseInt(process.env.SPAM_MESSAGE_LIMIT) || 5;
const TIME_WINDOW = parseInt(process.env.SPAM_TIME_WINDOW) || 5000; // 5 segundos

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignorar bots
    if (message.author.bot) return;
    
    // Ignorar DMs
    if (!message.guild) return;

    try {
      // ============================================
      // SISTEMA ANTI-SPAM
      // ============================================
      
      const userId = message.author.id;
      const now = Date.now();

      // Obtener mensajes previos del usuario
      if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
      }

      const messages = userMessages.get(userId);
      
      // Agregar mensaje actual
      messages.push(now);

      // Limpiar mensajes antiguos (fuera del tiempo de ventana)
      const recentMessages = messages.filter(timestamp => now - timestamp < TIME_WINDOW);
      userMessages.set(userId, recentMessages);

      // Verificar si excede el límite
      if (recentMessages.length >= SPAM_LIMIT) {
        
        // ✅ LOG DE SEGURIDAD - Spam detectado
        await logger.logSeguridad({
          description: `🚨 **SPAM DETECTADO**\n\n` +
                       `👤 **Usuario:** ${message.author.tag} (${message.author.id})\n` +
                       `📝 **Canal:** <#${message.channel.id}>\n` +
                       `📊 **Mensajes:** ${recentMessages.length} en ${TIME_WINDOW/1000}s\n` +
                       `⏰ **Hora:** <t:${Math.floor(Date.now() / 1000)}:F>`,
          fields: [
            { name: '📊 Límite', value: `${SPAM_LIMIT} mensajes`, inline: true },
            { name: '⏱️ Ventana', value: `${TIME_WINDOW/1000}s`, inline: true }
          ]
        });

        // Aplicar timeout
        try {
          await message.member.timeout(5 * 60 * 1000, 'Anti-Spam: mensajes excesivos');
          
          await logger.logTimeout({
            description: `⏱️ **Timeout aplicado por spam**\n\n` +
                         `👤 **Usuario:** ${message.author.tag}\n` +
                         `⏰ **Duración:** 5 minutos\n` +
                         `📝 **Razón:** Spam detectado (${recentMessages.length} mensajes)`,
            fields: []
          });

          // Limpiar el registro del usuario
          userMessages.delete(userId);

          logger.warn(`⏱️ Timeout aplicado a ${message.author.tag} por spam`);

        } catch (error) {
          logger.error(`❌ Error aplicando timeout a ${message.author.tag}:`, error.message);
        }

        // Intentar eliminar los mensajes spam
        try {
          const messagesToDelete = await message.channel.messages.fetch({ limit: SPAM_LIMIT });
          const userSpamMessages = messagesToDelete.filter(msg => msg.author.id === userId);
          await message.channel.bulkDelete(userSpamMessages, true);
        } catch (error) {
          logger.error('❌ Error eliminando mensajes spam:', error.message);
        }
      }

      // Limpiar el mapa periódicamente (cada 10 minutos)
      if (Math.random() < 0.01) { // 1% de probabilidad por mensaje
        const tenMinutesAgo = now - (10 * 60 * 1000);
        for (const [uid, timestamps] of userMessages.entries()) {
          const recent = timestamps.filter(t => t > tenMinutesAgo);
          if (recent.length === 0) {
            userMessages.delete(uid);
          } else {
            userMessages.set(uid, recent);
          }
        }
      }

    } catch (error) {
      logger.error('❌ Error en messageCreate:', error);
    }
  }
};
