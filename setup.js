const mongoose = require('mongoose');
const Guild = require('./src/models/Guild');
const logger = require('./src/utils/logger');
require('dotenv').config();

async function setup() {
  try {
    logger.info('🔧 Iniciando configuración inicial...');

    // Conectar a MongoDB
    logger.info('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.success('✅ Conectado a MongoDB');

    const guildId = process.env.GUILD_ID;
    
    if (!guildId) {
      logger.error('❌ GUILD_ID no está configurado en el .env');
      process.exit(1);
    }

    // Verificar si ya existe configuración
    let guildConfig = await Guild.findOne({ guildId });

    if (guildConfig) {
      logger.warn('⚠️ Ya existe una configuración para este servidor');
      logger.info('📋 Configuración actual:');
      console.log(JSON.stringify(guildConfig, null, 2));
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('\n¿Deseas sobrescribir la configuración? (s/N): ', async (answer) => {
        if (answer.toLowerCase() !== 's') {
          logger.info('❌ Configuración cancelada');
          readline.close();
          process.exit(0);
        }
        
        await createConfig(guildId);
        readline.close();
      });
    } else {
      await createConfig(guildId);
    }

  } catch (error) {
    logger.error('❌ Error en setup:', error);
    process.exit(1);
  }
}

async function createConfig(guildId) {
  try {
    // Crear o actualizar configuración
    const config = await Guild.findOneAndUpdate(
      { guildId },
      {
        guildId,
        antiNuke: {
          enabled: true,
          maxChannelDeletes: parseInt(process.env.MAX_CHANNEL_DELETES) || 3,
          maxRoleDeletes: parseInt(process.env.MAX_ROLE_DELETES) || 3,
          maxBans: parseInt(process.env.MAX_BANS) || 3
        },
        antiSpam: {
          enabled: true,
          messageLimit: parseInt(process.env.SPAM_MESSAGE_LIMIT) || 5,
          timeWindow: parseInt(process.env.SPAM_TIME_WINDOW) || 5000
        },
        logging: {
          enabled: true,
          channels: {
            discord: process.env.LOGS_DISCORD || 'LOGS_DISCORD',
            seguridad: process.env.LOGS_SEGURIDAD || 'seguridad-resumen',
            baneos: process.env.LOGS_BANEOS || 'BANEOS',
            timeout: process.env.LOGS_TIMEOUT || 'TIMEOUT',
            roles: process.env.LOGS_ROLES || 'ROLLS-REMOVIDOS',
            joins: process.env.LOGS_JOINS || 'JOINS',
            left: process.env.LOGS_LEFT || 'LEFT'
          }
        }
      },
      { upsert: true, new: true }
    );

    logger.success('✅ Configuración guardada correctamente');
    logger.info('📋 Configuración final:');
    console.log(JSON.stringify(config, null, 2));

    logger.info('\n✨ Setup completado. Ya puedes iniciar el bot con: npm start');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Error al crear configuración:', error);
    process.exit(1);
  }
}

// Ejecutar setup
setup();
