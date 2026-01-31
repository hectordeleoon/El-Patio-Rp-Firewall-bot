# 🛡️ El Patio RP Firewall Bot v2.0

Bot de seguridad profesional para Discord con protección anti-nuke, anti-spam y sistema de logs completo.

## ✨ Características

### 🚨 Anti-Nuke
- Detección y reversión automática de:
  - Eliminación masiva de canales
  - Eliminación masiva de roles
  - Baneos masivos
- Sanciones automáticas al atacante:
  - Remoción de todos los roles
  - Timeout de 28 días
  - Alertas en canal de seguridad

### 💬 Anti-Spam
- Detección de mensajes spam
- Timeout automático (10 minutos)
- Eliminación de mensajes spam
- Sistema de rate limiting configurable

### 📊 Sistema de Logs
- Registro de joins/leaves
- Registro de baneos
- Registro de timeouts
- Registro de cambios de roles
- Alertas de seguridad

## 🚀 Instalación Rápida

### 1. Clonar el proyecto
```bash
git clone <tu-repo>
cd el-patio-rp-firewall
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita .env y completa:
# - DISCORD_TOKEN (obtén uno en https://discord.com/developers)
# - MONGODB_URI (crea un cluster gratis en https://cloud.mongodb.com)
# - GUILD_ID (ID de tu servidor de Discord)
```

### 4. Configurar el bot
```bash
npm run setup
```

### 5. Iniciar el bot
```bash
npm start
```

## ⚙️ Configuración

### Variables de entorno (.env)

```env
# Discord
DISCORD_TOKEN=tu_token_aqui
CLIENT_ID=tu_client_id
GUILD_ID=id_de_tu_servidor
OWNER_ID=tu_id_de_usuario

# MongoDB
MONGODB_URI=mongodb+srv://...

# Redis (opcional)
REDIS_URL=

# Límites Anti-Nuke
MAX_CHANNEL_DELETES=3
MAX_ROLE_DELETES=3
MAX_BANS=3

# Anti-Spam
SPAM_MESSAGE_LIMIT=5
SPAM_TIME_WINDOW=5000
```

### Permisos requeridos del bot

El bot necesita estos permisos en Discord:
- ✅ Administrator (recomendado)

O específicamente:
- ✅ Manage Channels
- ✅ Manage Roles
- ✅ Ban Members
- ✅ Kick Members
- ✅ Manage Messages
- ✅ View Audit Log
- ✅ Moderate Members (timeout)

## 🌐 Hosting 24/7

### Opción 1: Render.com (Gratis)
1. Crea cuenta en https://render.com
2. Conecta tu repositorio GitHub
3. Configura las variables de entorno
4. Deploy automático

### Opción 2: Railway.app ($5/mes)
1. Crea cuenta en https://railway.app
2. Conecta GitHub
3. Deploy con un click

### Opción 3: VPS con PM2
```bash
# Instalar PM2
npm install -g pm2

# Iniciar bot
pm2 start start.js --name el-patio-firewall

# Guardar configuración
pm2 startup
pm2 save
```

## 📝 Scripts disponibles

```bash
npm start       # Iniciar el bot
npm run dev     # Modo desarrollo con nodemon
npm run setup   # Configurar base de datos
```

## 🔧 Arquitectura Técnica

### Estructura del proyecto
```
el-patio-rp-firewall/
├── src/
│   ├── index.js           # Entrada principal
│   ├── events/            # Eventos de Discord
│   │   ├── ready.js
│   │   ├── guildBanAdd.js
│   │   ├── channelDelete.js
│   │   ├── roleDelete.js
│   │   ├── messageCreate.js
│   │   ├── guildMemberAdd.js
│   │   └── guildMemberRemove.js
│   ├── models/            # Modelos de MongoDB
│   │   └── Guild.js
│   └── utils/             # Utilidades
│       ├── eventHandler.js
│       ├── logger.js
│       └── redis.js
├── start.js               # Script de inicio
├── setup.js               # Script de configuración
├── package.json
└── .env
```

### Tecnologías
- **Discord.js v14** - Librería de Discord
- **Mongoose** - ODM para MongoDB
- **ioredis** - Cliente de Redis (opcional)
- **Chalk** - Logs con colores

## 🆘 Solución de Problemas

### El bot no se conecta
- Verifica que el token sea correcto
- Revisa que MONGODB_URI esté completa
- Asegúrate de tener Node.js 18+

### Anti-Nuke no se activa
- Ejecuta `npm run setup` para crear la configuración
- Verifica que `antiNuke.enabled = true` en MongoDB
- Revisa que el bot tenga permisos de administrador

### Errores de permisos
- El rol del bot debe estar por encima de todos los demás
- Necesita permisos de Administrador o los específicos listados arriba

## 📄 Licencia

MIT License - El Patio RP

## 🤝 Soporte

Para problemas o preguntas, contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ para El Patio RP**
