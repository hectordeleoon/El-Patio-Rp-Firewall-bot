const { Client, GatewayIntentBits, Partials } = require('discord.js');
const mongoose = require('mongoose');
const eventHandler = require('./utils/eventHandler');
const logger = require('./utils/logger');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User]
});

// ✅ ARREGLO PRINCIPAL: Inicialización con async/await
async function startBot() {
  try {
    // 1. Conectar MongoDB PRIMERO
    logger.info('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.success('✅ MongoDB conectado correctamente');

    // 2. Cargar eventos DESPUÉS de que MongoDB esté listo
    logger.info('📂 Cargando eventos...');
    await eventHandler(client);
    logger.success('✅ Eventos cargados');

    // 3. Login a Discord
    logger.info('🤖 Iniciando sesión en Discord...');
    await client.login(process.env.DISCORD_TOKEN);
    
  } catch (error) {
    logger.error('❌ Error fatal al iniciar el bot:', error);
    process.exit(1);
  }
}

// Manejo de errores globales
process.on('unhandledRejection', (error) => {
  logger.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar el bot
startBot();
