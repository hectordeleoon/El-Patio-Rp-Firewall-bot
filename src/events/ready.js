const logger = require('../utils/logger');
const Guild = require('../models/Guild');

module.exports = {
  name: 'ready',
  once: true,
  
  async execute(client) {
    try {
      logger.success(`✅ Bot conectado como ${client.user.tag}`);
      logger.info(`📊 Sirviendo a ${client.guilds.cache.size} servidor(es)`);
      
      // Configurar presencia
      client.user.setPresence({
        activities: [{ name: 'El Patio RP | Protección 24/7' }],
        status: 'online'
      });

      // Verificar configuración del servidor
      for (const [guildId, guild] of client.guilds.cache) {
        let guildConfig = await Guild.findOne({ guildId: guild.id });
        
        if (!guildConfig) {
          logger.warn(`⚠️ Servidor sin configuración: ${guild.name} - Creando configuración por defecto`);
          guildConfig = new Guild({
            guildId: guild.id,
            antiNuke: { enabled: true },
            antiSpam: { enabled: true }
          });
          await guildConfig.save();
          logger.success(`✅ Configuración creada para ${guild.name}`);
        }
      }

      logger.success('🛡️ El Patio RP Firewall está activo y protegiendo el servidor');
      
    } catch (error) {
      logger.error('❌ Error en evento ready:', error);
    }
  }
};
