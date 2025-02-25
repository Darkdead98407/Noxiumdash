const fs = require('fs').promises;
const path = require('path');
const session = require('express-session');

// Asegurar que el directorio data existe
const dataDir = path.join(__dirname, '..', 'data');

// Rutas de los archivos JSON
const FILES = {
    LEVELS: path.join(dataDir, 'levels.json'),
    LEVEL_CHANNELS: path.join(dataDir, 'level_channels.json'),
    SESSIONS: path.join(dataDir, 'sessions.json')
};

// Función auxiliar para inicializar archivos JSON
async function initializeJsonFiles() {
    try {
        // Crear directorio si no existe
        await fs.mkdir(dataDir, { recursive: true });

        // Inicializar cada archivo con un objeto vacío si no existe
        for (const filePath of Object.values(FILES)) {
            try {
                await fs.access(filePath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    await fs.writeFile(filePath, '{}', 'utf8');
                    console.log(`✅ Archivo JSON inicializado: ${filePath}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error inicializando archivos JSON:', error);
        throw error;
    }
}

// Función auxiliar para leer un archivo JSON
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(filePath, '{}', 'utf8');
            return {};
        }
        throw error;
    }
}

// Función auxiliar para escribir un archivo JSON
async function writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Gestión de niveles
const levelStorage = {
    async getUserLevel(userId, guildId) {
        const levels = await readJsonFile(FILES.LEVELS);
        const key = `${userId}_${guildId}`;
        return levels[key] || { xp: 0, level: 0, last_message_timestamp: new Date(0) };
    },

    async updateUserLevel(userId, guildId, data) {
        const levels = await readJsonFile(FILES.LEVELS);
        const key = `${userId}_${guildId}`;
        levels[key] = {
            ...data,
            last_message_timestamp: data.last_message_timestamp.toISOString()
        };
        await writeJsonFile(FILES.LEVELS, levels);
    },

    async getLevelChannel(guildId) {
        const channels = await readJsonFile(FILES.LEVEL_CHANNELS);
        return channels[guildId];
    },

    async setLevelChannel(guildId, channelId) {
        const channels = await readJsonFile(FILES.LEVEL_CHANNELS);
        channels[guildId] = channelId;
        await writeJsonFile(FILES.LEVEL_CHANNELS, channels);
    }
};

// Crear una clase Store personalizada que extienda de session.Store
class JsonFileStore extends session.Store {
    constructor() {
        super();
        // Inicializar archivos JSON al crear la instancia
        initializeJsonFiles().catch(console.error);
    }

    async get(sid, callback) {
        try {
            const sessions = await readJsonFile(FILES.SESSIONS);
            const session = sessions[sid];
            callback(null, session);
        } catch (err) {
            callback(err);
        }
    }

    async set(sid, session, callback) {
        try {
            const sessions = await readJsonFile(FILES.SESSIONS);
            sessions[sid] = session;
            await writeJsonFile(FILES.SESSIONS, sessions);
            callback(null);
        } catch (err) {
            callback(err);
        }
    }

    async destroy(sid, callback) {
        try {
            const sessions = await readJsonFile(FILES.SESSIONS);
            delete sessions[sid];
            await writeJsonFile(FILES.SESSIONS, sessions);
            callback(null);
        } catch (err) {
            callback(err);
        }
    }

    async all(callback) {
        try {
            const sessions = await readJsonFile(FILES.SESSIONS);
            callback(null, Object.values(sessions));
        } catch (err) {
            callback(err);
        }
    }

    async length(callback) {
        try {
            const sessions = await readJsonFile(FILES.SESSIONS);
            callback(null, Object.keys(sessions).length);
        } catch (err) {
            callback(err);
        }
    }

    async clear(callback) {
        try {
            await writeJsonFile(FILES.SESSIONS, {});
            callback(null);
        } catch (err) {
            callback(err);
        }
    }
}

// Exportar el store de sesiones como una instancia
const sessionStore = new JsonFileStore();

module.exports = {
    levelStorage,
    sessionStore,
    initializeJsonFiles
};