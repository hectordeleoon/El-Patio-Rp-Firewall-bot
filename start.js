// ⚠️ CRÍTICO: Cargar dotenv PRIMERO, antes de cualquier otra cosa
require('dotenv').config();

const express = require('express'); // 👈 AÑADIR
const logger = require('./src/utils/logger');

// 🌐 HEALTH CHECK HTTP (OBLIGATORIO PARA RAILWAY)
const app = express();

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info(`🌐 Health check activo en puerto ${PORT}`);
});

// Banner de inicio
console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🛡️  EL PATIO RP FIREWALL BOT v2.0                      ║
║                                                           ║
║   Sistema de protección anti-nuke y anti-spam            ║
║   Desarrollado para El Patio RP                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

logger.info('🚀 Iniciando El Patio RP Firewall Bot...');

// Verificar variables de entorno críticas
const requiredEnvVars = ['DISCORD_TOKEN', 'MONGODB_URI', 'GUILD_ID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error('❌ Faltan variables de entorno requeridas:');
  mi
