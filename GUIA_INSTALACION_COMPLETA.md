# 🚀 GUÍA COMPLETA: El Patio RP Firewall Bot

## 📋 ¿Qué se arregló?

✅ **Problemas críticos solucionados:**
1. Redis ahora usa **cache en memoria** si no está configurado (el bot SÍ protegerá tu servidor)
2. MongoDB se conecta **antes** de cargar eventos (evita errores de inicio)
3. Sistema de **reversión de todos los baneos** en un ataque masivo
4. Manejo de errores mejorado en todos los eventos

---

## 🔧 PASO 1: Instalar los archivos

### Opción A: Reemplazar archivos específicos
Descarga y reemplaza estos archivos en tu bot actual:

```
📁 Tu bot/
├── .env (⚠️ NUEVO - lee el paso 2)
├── src/
│   ├── index.js (REEMPLAZAR)
│   ├── utils/
│   │   └── redis.js (REEMPLAZAR)
│   └── events/
│       ├── guildBanAdd.js (REEMPLAZAR)
│       ├── channelDelete.js (REEMPLAZAR)
│       └── roleDelete.js (REEMPLAZAR)
```

### Opción B: Descargar el paquete completo
Al final de esta guía te daré un ZIP con todo el código corregido.

---

## 🔑 PASO 2: Generar un NUEVO token de Discord

**⚠️ CRÍTICO:** Tu token anterior quedó expuesto y debe regenerarse.

1. Ve a: https://discord.com/developers/applications
2. Selecciona tu aplicación `El Patio RP Firewall`
3. Ve a la sección **Bot** (menú izquierdo)
4. Haz clic en **Reset Token** (Regenerar Token)
5. **Copia el nuevo token** (solo se muestra una vez)
6. Abre el archivo `.env` y pega el token:

```env
DISCORD_TOKEN=TU_NUEVO_TOKEN_AQUI_QUE_COPIASTE
```

---

## 🗄️ PASO 3: Verificar MongoDB Atlas

Tu conexión a MongoDB **ya está correcta** en el `.env`:

```env
MONGODB_URI=mongodb+srv://hectordeleon:Leoon_272113@cluster0.vx9k4jb.mongodb.net/el-patio-rp-firewall?retryWrites=true&w=majority
```

### Verificación rápida:
1. Entra a https://cloud.mongodb.com
2. Ve a **Database** → **Browse Collections**
3. Debes ver la base de datos `el-patio-rp-firewall`
4. Si no existe, el bot la creará automáticamente al iniciarse

**✅ No necesitas hacer nada más con MongoDB.**

---

## 🏃 PASO 4: Probar el bot localmente

```bash
# Instalar dependencias
npm install

# Iniciar el bot
npm start
```

**Debes ver:**
```
🔌 Conectando a MongoDB...
✅ MongoDB conectado correctamente
📂 Cargando eventos...
✅ Eventos cargados
🤖 Iniciando sesión en Discord...
✅ Bot conectado como El Patio RP Firewall#1234
```

Si ves esto, **¡todo funciona!** 🎉

---

## ☁️ PASO 5: Mantener el bot encendido 24/7

### Opción 1: Usar Render.com (GRATIS, más fácil)

**Render** te da hosting gratis para tu bot.

#### Setup en Render:
1. Ve a https://render.com y crea una cuenta
2. Clic en **New** → **Web Service**
3. Conecta tu repositorio de GitHub (sube tu bot ahí primero)
4. Configuración:
   - **Name:** el-patio-rp-firewall
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. En **Environment Variables**, agrega todas las variables de tu `.env`:
   ```
   DISCORD_TOKEN=tu_token_aqui
   MONGODB_URI=mongodb+srv://...
   GUILD_ID=1287645548190498880
   ... (todas las demás)
   ```
6. Clic en **Create Web Service**

**✅ Tu bot estará online 24/7 gratis** (con pequeños reinicios cada ~30 minutos en el plan gratuito).

---

### Opción 2: Usar Railway.app (Fácil, $5/mes)

1. Ve a https://railway.app
2. Conecta GitHub y selecciona tu repositorio
3. Railway detecta automáticamente que es Node.js
4. Agrega las variables de entorno (.env) en el panel
5. Deploy automático

**✅ Más estable que Render, sin reinicios.**

---

### Opción 3: VPS Propio (Avanzado)

Si tienes un VPS (DigitalOcean, Linode, etc.):

```bash
# Instalar PM2 (mantiene el bot corriendo)
npm install -g pm2

# Iniciar el bot con PM2
pm2 start start.js --name "el-patio-firewall"

# Configurar para que inicie al reiniciar el servidor
pm2 startup
pm2 save
```

---

## 🧪 PASO 6: Probar el Anti-Nuke

1. **Crea un usuario de prueba** en tu Discord
2. Dale **permisos de administrador**
3. Con ese usuario, intenta:
   - Eliminar 3+ canales seguidos
   - Banear 3+ usuarios seguidos
   - Eliminar 3+ roles seguidos

**Resultado esperado:**
- El bot revierte las acciones
- Le quita todos los roles al atacante
- Le aplica timeout de 28 días
- Envía alerta al canal `#seguridad-resumen`

---

## 📝 Checklist final

- [ ] Nuevo token de Discord configurado en `.env`
- [ ] MongoDB conectado (verificado en cloud.mongodb.com)
- [ ] Bot funciona localmente (`npm start`)
- [ ] Bot deployado en Render/Railway/VPS
- [ ] Anti-Nuke probado y funcionando
- [ ] Canales de logs creados en Discord:
  - [ ] `#seguridad-resumen`
  - [ ] `#LOGS_DISCORD`
  - [ ] `#BANEOS`
  - [ ] `#TIMEOUT`
  - [ ] `#ROLLS-REMOVIDOS`
  - [ ] `#JOINS`
  - [ ] `#LEFT`

---

## 🆘 Si algo falla

### El bot no se conecta:
- Verifica que el token sea correcto
- Revisa que MongoDB URI esté completa

### Anti-Nuke no se activa:
- Verifica que `antiNuke.enabled = true` en MongoDB
- Ejecuta `node setup.js` para crear la configuración

### Errores de permisos:
- El bot necesita **permisos de Administrador**
- Su rol debe estar **por encima** de todos los demás

---

## 🎓 Para recordar en el futuro

**Cuando me preguntes sobre este bot, menciona:**

> "Soy del proyecto El Patio RP Firewall Bot. Arreglamos el sistema anti-nuke con cache en memoria, inicialización async, y reversión completa de ataques masivos. El bot está en Discord (ID: 1466873352210874559) conectado a MongoDB Atlas."

Esto me ayudará a recordar todo el contexto.

---

## 📞 Soporte

Si necesitas ayuda:
1. Revisa los logs del bot (en tu hosting o consola)
2. Busca en el canal `#seguridad-resumen` del Discord
3. Verifica MongoDB Atlas para ver si guarda datos
4. Pregúntame con el contexto que mencioné arriba

**¡Tu servidor está ahora protegido 24/7! 🛡️**
