const fs = require('fs').promises;
const path = require('path');

// Asegurar que el directorio data existe
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdir(dataDir, { recursive: true }).catch(console.error);

// Rutas de los archivos JSON
const FILES = {
    LEVELS: path.join(dataDir, 'levels.json'),
    LEVEL_CHANNELS: path.join(dataDir, 'level_channels.json'),
    SESSIONS: path.join(dataDir, 'sessions.json')
};

// Función auxiliar para leer un archivo JSON
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Si el archivo no existe, crear uno vacío
            await writeJsonFile(filePath, {});
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

// Gestión de sesiones
const sessionStorage = {
    async getAllSessions() {
        return await readJsonFile(FILES.SESSIONS);
    },

    async getSession(sessionId) {
        const sessions = await this.getAllSessions();
        return sessions[sessionId];
    },

    async setSession(sessionId, session) {
        const sessions = await this.getAllSessions();
        sessions[sessionId] = session;
        await writeJsonFile(FILES.SESSIONS, sessions);
    },

    async deleteSession(sessionId) {
        const sessions = await this.getAllSessions();
        delete sessions[sessionId];
        await writeJsonFile(FILES.SESSIONS, sessions);
    }
};

module.exports = {
    levelStorage,
    sessionStorage
};