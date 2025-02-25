const NodeCache = require('node-cache');

// Crear instancias de caché para diferentes tipos de datos
const cache = {
    levels: new NodeCache({ stdTTL: 300 }), // 5 minutos para niveles
    channels: new NodeCache({ stdTTL: 3600 }), // 1 hora para canales
    commands: new NodeCache({ stdTTL: 1800 }), // 30 minutos para comandos
};

// Estadísticas de uso del caché
const stats = {
    levels: { hits: 0, misses: 0, keys: 0 },
    channels: { hits: 0, misses: 0, keys: 0 },
    commands: { hits: 0, misses: 0, keys: 0 }
};

// Función para generar claves de caché
const generateCacheKey = (type, ...params) => {
    return `${type}_${params.join('_')}`;
};

// Funciones de utilidad para el caché
const cacheUtils = {
    // Obtener datos del caché
    async getOrSet(type, key, fetchFunction) {
        const cacheKey = generateCacheKey(type, key);
        const cachedData = cache[type].get(cacheKey);

        if (cachedData !== undefined) {
            stats[type].hits++;
            return cachedData;
        }

        stats[type].misses++;
        const freshData = await fetchFunction();
        if (freshData !== null && freshData !== undefined) {
            cache[type].set(cacheKey, freshData);
            stats[type].keys = cache[type].keys().length;
        }
        return freshData;
    },

    // Invalidar una entrada específica del caché
    invalidate(type, key) {
        const cacheKey = generateCacheKey(type, key);
        cache[type].del(cacheKey);
        stats[type].keys = cache[type].keys().length;
    },

    // Invalidar todo el caché de un tipo
    invalidateAll(type) {
        cache[type].flushAll();
        stats[type].keys = 0;
    },

    // Obtener estadísticas del caché
    getStats(type) {
        return { ...stats[type] };
    }
};

module.exports = cacheUtils;