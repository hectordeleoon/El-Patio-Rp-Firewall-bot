const chalk = require('chalk');
const { EmbedBuilder } = require('discord.js');

class Logger {
  constructor() {
    this.prefix = '[El Patio RP]';
    this.client = null;
    this.channels = {};
  }

  /**
   * Inicializar el logger con el cliente de Discord
   * Llamar esto en index.js después de client.login()
   */
  async init(client) {
    this.client = client;
    
    try {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      
      // Buscar canales por ID o nombre
      const channelConfig = {
        discord: process.env.LOGS_DISCORD || 'LOGS_DISCORD',
        seguridad: process.env.LOGS_SEGURIDAD || 'seguridad-resumen',
        baneos: process.env.LOGS_BANEOS || 'BANEOS',
        timeout: process.env.LOGS_TIMEOUT || 'TIMEOUT',
        roles: process.env.LOGS_ROLES || 'ROLLS-REMOVIDOS',
        joins: process.env.LOGS_JOINS || 'JOINS',
        left: process.env.LOGS_LEFT || 'LEFT',
        firewall: process.env.LOGS_ALERTAS || 'firewall-alertas',
        criticos: process.env.LOGS_CRITICOS || 'logs-criticos'
      };

      // Obtener todos los canales del servidor
      const allChannels = await guild.channels.fetch();
      
      // Buscar y guardar cada canal (por ID o nombre)
      for (const [key, value] of Object.entries(channelConfig)) {
        let channel;
        
        // Intentar buscar por ID primero (si parece un ID de Discord)
        if (/^\d+$/.test(value)) {
          try {
            channel = await guild.channels.fetch(value);
          } catch {
            channel = null;
          }
        }
        
        // Si no se encontró por ID, buscar por nombre
        if (!channel) {
          channel = allChannels.find(ch => 
            ch.name.toLowerCase() === value.toLowerCase()
          );
        }
        
        if (channel) {
          this.channels[key] = channel;
          this.success(`✅ Canal de logs encontrado: ${channel.name} (${channel.id})`);
        } else {
          this.warn(`⚠️ Canal de logs NO encontrado: ${value}`);
        }
      }

      this.success('✅ Logger de Discord inicializado correctamente');
      
    } catch (error) {
      this.error('❌ Error inicializando logger de Discord:', error);
    }
  }

  getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  // =============================
  // MÉTODOS DE CONSOLA
  // =============================

  info(message, ...args) {
    console.log(
      chalk.blue(`${this.getTimestamp()} [INFO]`),
      this.prefix,
      message,
      ...args
    );
  }

  success(message, ...args) {
    console.log(
      chalk.green(`${this.getTimestamp()} [SUCCESS]`),
      this.prefix,
      message,
      ...args
    );
  }

  warn(message, ...args) {
    console.log(
      chalk.yellow(`${this.getTimestamp()} [WARN]`),
      this.prefix,
      message,
      ...args
    );
  }

  error(message, ...args) {
    console.error(
      chalk.red(`${this.getTimestamp()} [ERROR]`),
      this.prefix,
      message,
      ...args
    );
  }

  debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        chalk.gray(`${this.getTimestamp()} [DEBUG]`),
        this.prefix,
        message,
        ...args
      );
    }
  }

  event(eventName, details) {
    console.log(
      chalk.cyan(`${this.getTimestamp()} [EVENT]`),
      this.prefix,
      chalk.bold(eventName),
      details || ''
    );
  }

  // =============================
  // MÉTODOS DE DISCORD LOGS
  // =============================

  /**
   * Enviar log a un canal de Discord
   * @param {string} channelKey - Clave del canal (seguridad, firewall, etc.)
   * @param {Object} embedData - Datos del embed
   */
  async sendLog(channelKey, embedData) {
    try {
      if (!this.client) {
        this.warn('⚠️ Logger no inicializado, no se puede enviar log a Discord');
        return false;
      }

      const channel = this.channels[channelKey];
      
      if (!channel) {
        this.warn(`⚠️ Canal de logs "${channelKey}" no encontrado`);
        return false;
      }

      const embed = new EmbedBuilder()
        .setColor(embedData.color || 0x3498db)
        .setTitle(embedData.title || 'Log')
        .setTimestamp();

      if (embedData.description) embed.setDescription(embedData.description);
      if (embedData.fields) embed.addFields(embedData.fields);
      if (embedData.footer) embed.setFooter(embedData.footer);
      if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
      if (embedData.image) embed.setImage(embedData.image);
      if (embedData.author) embed.setAuthor(embedData.author);

      await channel.send({ embeds: [embed] });
      this.info(`📨 Log enviado a #${channel.name}`);
      return true;

    } catch (error) {
      this.error(`❌ Error enviando log a canal ${channelKey}:`, error.message);
      return false;
    }
  }

  // =============================
  // LOGS DE SEGURIDAD
  // =============================

  /**
   * Log de seguridad general
   */
  async logSeguridad(data) {
    return this.sendLog('seguridad', {
      color: 0xe67e22, // Naranja
      title: '🛡️ Log de Seguridad',
      description: data.description,
      fields: data.fields || [],
      footer: { text: 'Sistema de Seguridad El Patio RP' }
    });
  }

  /**
   * Log de firewall (alertas críticas)
   */
  async logFirewall(data) {
    return this.sendLog('firewall', {
      color: 0xe74c3c, // Rojo
      title: '🚨 ALERTA DE FIREWALL',
      description: data.description,
      fields: data.fields || [],
      footer: { text: '⚠️ Alerta Crítica - Firewall Activo' },
      thumbnail: 'https://i.imgur.com/warning.png' // Opcional
    });
  }

  /**
   * Log crítico
   */
  async logCritico(data) {
    return this.sendLog('criticos', {
      color: 0xc0392b, // Rojo oscuro
      title: '🔥 EVENTO CRÍTICO',
      description: data.description,
      fields: data.fields || [],
      footer: { text: '⚠️ Requiere Atención Inmediata' }
    });
  }

  /**
   * Log de baneos
   */
  async logBan(data) {
    return this.sendLog('baneos', {
      color: 0x992d22,
      title: '🔨 Ban Registrado',
      description: data.description,
      fields: data.fields || []
    });
  }

  /**
   * Log de timeouts
   */
  async logTimeout(data) {
    return this.sendLog('timeout', {
      color: 0xf39c12,
      title: '⏱️ Timeout Aplicado',
      description: data.description,
      fields: data.fields || []
    });
  }

  /**
   * Log de roles
   */
  async logRole(data) {
    return this.sendLog('roles', {
      color: 0x9b59b6,
      title: '👑 Cambio de Rol',
      description: data.description,
      fields: data.fields || []
    });
  }

  /**
   * Log de miembro nuevo
   */
  async logJoin(data) {
    return this.sendLog('joins', {
      color: 0x2ecc71,
      title: '👋 Nuevo Miembro',
      description: data.description,
      fields: data.fields || []
    });
  }

  /**
   * Log de miembro que se fue
   */
  async logLeave(data) {
    return this.sendLog('left', {
      color: 0x95a5a6,
      title: '👋 Miembro Salió',
      description: data.description,
      fields: data.fields || []
    });
  }

  /**
   * Log general de Discord
   */
  async logDiscord(data) {
    return this.sendLog('discord', {
      color: 0x5865f2,
      title: data.title || '📝 Log de Discord',
      description: data.description,
      fields: data.fields || []
    });
  }

  // =============================
  // MÉTODOS DE UTILIDAD
  // =============================

  /**
   * Verificar si un canal de logs está disponible
   */
  hasChannel(channelKey) {
    return !!this.channels[channelKey];
  }

  /**
   * Obtener canal de logs
   */
  getChannel(channelKey) {
    return this.channels[channelKey];
  }

  /**
   * Listar canales de logs disponibles
   */
  listChannels() {
    const available = Object.entries(this.channels)
      .map(([key, ch]) => `${key}: #${ch.name} (${ch.id})`)
      .join('\n');
    
    this.info('📋 Canales de logs disponibles:\n' + available);
  }
}

module.exports = new Logger();
