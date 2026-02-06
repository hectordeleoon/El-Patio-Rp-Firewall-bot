require('dotenv').config();
const express = require('express');
const logger = require('./src/utils/logger');

// 🌐 HEALTH CHECK (SIEMPRE VIVO)
const app = express();
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  // ❌ ANTES: logger.info`🌐 Health check activo en puerto ${PORT}`);
  // ✅ AHORA:
  logger.info(`🌐 Health check activo en puerto ${PORT}`);
});

// Banner
console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🛡️  EL PATIO RP FIREWALL BOT v2.0                      ║
║                                                           ║
║   Sistema de protección anti-nuke y anti-spam            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

logger.info('🚀 Iniciando El Patio RP Firewall Bot...');

// ❗ VALIDAR VARIABLES SOLO PARA DISCORD
const requiredEnvVars = ['DISCORD_TOKEN', 'MONGODB_URI', 'GUILD_ID'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  logger.error('❌ Faltan variables críticas para Discord:');
  // ❌ ANTES: missingVars.forEach(v => logger.error`   - ${v}`));
  // ✅ AHORA:
  missingVars.forEach(v => logger.error(`   - ${v}`));
  logger.error('⚠️ El bot Discord NO se iniciará, pero el health check sigue activo.');
} else {
  // 🤖 SOLO iniciar Discord si todo está OK
  require('./src/index.js');
}
