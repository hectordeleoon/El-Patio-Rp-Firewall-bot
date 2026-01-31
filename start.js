// ⚠️ CRÍTICO: Cargar dotenv PRIMERO, antes de cualquier otra cosa
require('dotenv').config();

const logger = require('./src/utils/logger');

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
  missingVars.forEach(varName => {
    logger.error(`   - ${varName}`);
  });
  logger.error('\n💡 Revisa tu archivo .env y asegúrate de que estén todas las variables.');
  process.exit(1);
}

// Iniciar el bot
require('./src/index.js');