const Redis = require('ioredis');
const logger = require('./logger');

// ✅ ARREGLO CRÍTICO: Fallback en memoria cuando no hay Redis
let redis = null;
const memoryCache = new Map(); // Cache en memoria como respaldo

// Intentar conectar a Redis solo si REDIS_URL está configurada
if (process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '') {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    redis.on('connect', () => {
      logger.success('✅ Redis conectado correctamente');
    });

    redis.on('error', (err) => {
      logger.error('❌ Error de Redis:', err.message);
      logger.warn('⚠️ Usando cache en memoria como respaldo');
      redis = null; // Deshabilitar Redis y usar memoria
    });

  } catch (error) {
    logger.error('❌ No se pudo inicializar Redis:', error.message);
    logger.warn('⚠️ Usando cache en memoria');
    redis = null;
  }
} else {
  logger.warn('⚠️ REDIS_URL no configurada - usando cache en memoria');
}

/**
 * Incrementa el contador de acciones de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} action - Tipo de acción (ban, channelDelete, roleDelete)
 * @param {number} ttl - Tiempo de vida en segundos
 * @returns {Promise<number>} Número de acciones realizadas
 */
async function incrementAction(userId, action, ttl = 60) {
  const key = `ratelimit:${action}:${userId}`;
  
  if (redis) {
    // Usar Redis si está disponible
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, ttl);
      }
      return count;
    } catch (error) {
      logger.error(`Error en Redis (${action}):`, error.message);
      // Fallback a memoria si Redis falla
    }
  }
  
  // Fallback: usar cache en memoria
  const now = Date.now();
  const cacheData = memoryCache.get(key) || { count: 0, expiry: now + (ttl * 1000) };
  
  // Limpiar si expiró
  if (cacheData.expiry < now) {
    cacheData.count = 0;
    cacheData.expiry = now + (ttl * 1000);
  }
  
  cacheData.count++;
  memoryCache.set(key, cacheData);
  
  return cacheData.count;
}

/**
 * Verifica si un usuario excedió el límite de acciones
 * @param {string} userId - ID del usuario
 * @param {string} action - Tipo de acción
 * @param {number} limit - Límite permitido
 * @param {number} ttl - Ventana de tiempo en segundos
 * @returns {Promise<boolean>} true si excedió el límite
 */
async function checkRateLimit(userId, action, limit, ttl = 60) {
  const count = await incrementAction(userId, action, ttl);
  return count > limit;
}

/**
 * Resetea el contador de un usuario para una acción
 * @param {string} userId - ID del usuario
 * @param {string} action - Tipo de acción
 */
async function resetAction(userId, action) {
  const key = `ratelimit:${action}:${userId}`;
  
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch (error) {
      logger.error(`Error reseteando en Redis (${action}):`, error.message);
    }
  }
  
  // Fallback: memoria
  memoryCache.delete(key);
}

/**
 * Limpia periódicamente las entradas expiradas del cache en memoria
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of memoryCache.entries()) {
    if (data.expiry < now) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Cada minuto

module.exports = {
  redis,
  incrementAction,
  checkRateLimit,
  resetAction
};
