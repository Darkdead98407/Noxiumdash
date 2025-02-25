const { EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');
const cacheUtils = require('../utils/cache');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Función para calcular el XP por mensaje según el nivel
function getXPPerMessage(level) {
    if (level === 0) return 50; // 50% para nivel 1
    if (level <= 5) return 25;  // 25% para niveles 2-5
    if (level <= 20) return 10; // 10% para niveles 6-20
    if (level <= 50) return 5;  // 5% para niveles 21-50
    return 2;                   // 2% para niveles 50+
}

// Función para calcular XP necesario para siguiente nivel
const XP_FOR_LEVEL = (level) => 100 * Math.pow(level, 1.5);
const XP_COOLDOWN = 1000; // 1 segundo de cooldown entre mensajes

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        try {
            const now = new Date();
            const cacheKey = `${message.author.id}_${message.guild.id}`;

            // Intentar obtener datos del caché primero
            const userData = await cacheUtils.getOrSet('levels', cacheKey, async () => {
                const result = await pool.query(
                    'SELECT * FROM user_levels WHERE user_id = $1 AND guild_id = $2',
                    [message.author.id, message.guild.id]
                );
                return result.rows[0] || null;
            });

            if (!userData) {
                // Crear nuevo registro para el usuario
                await pool.query(
                    'INSERT INTO user_levels (user_id, guild_id, xp, level, last_message_timestamp) VALUES ($1, $2, $3, $4, $5)',
                    [message.author.id, message.guild.id, 0, 0, now]
                );
                cacheUtils.invalidate('levels', cacheKey);
                return;
            }

            const lastMessage = userData.last_message_timestamp ? new Date(userData.last_message_timestamp) : new Date(0);
            if (now - lastMessage >= XP_COOLDOWN) {
                // Calcular XP basado en el nivel actual
                const currentLevel = userData.level;
                const xpGainPercentage = getXPPerMessage(currentLevel);
                const nextLevelXP = XP_FOR_LEVEL(currentLevel + 1);
                const currentLevelXP = XP_FOR_LEVEL(currentLevel);
                const xpNeeded = nextLevelXP - currentLevelXP;
                const xpGain = Math.floor((xpNeeded * xpGainPercentage) / 100);

                console.log(`[DEBUG] Usuario: ${message.author.tag}`);
                console.log(`[DEBUG] Nivel actual: ${currentLevel}`);
                console.log(`[DEBUG] XP actual: ${userData.xp}`);
                console.log(`[DEBUG] XP ganado: ${xpGain}`);
                console.log(`[DEBUG] XP para siguiente nivel: ${nextLevelXP}`);
                console.log(`[DEBUG] XP nivel actual: ${currentLevelXP}`);
                console.log(`[DEBUG] XP necesario: ${xpNeeded}`);
                console.log(`[DEBUG] Porcentaje de ganancia: ${xpGainPercentage}%`);

                // Actualizar XP
                const newXP = userData.xp + xpGain;
                let newLevel = currentLevel;

                // Verificar si subió de nivel
                while (newXP >= XP_FOR_LEVEL(newLevel + 1)) {
                    newLevel++;

                    // Obtener el canal configurado para las notificaciones de nivel
                    const channelId = await cacheUtils.getOrSet('channels', `level_${message.guild.id}`, async () => {
                        const result = await pool.query(
                            'SELECT channel_id FROM level_channels WHERE guild_id = $1',
                            [message.guild.id]
                        );
                        return result.rows[0]?.channel_id;
                    });

                    // Crear mensaje de felicitación
                    const levelUpEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('🎉 ¡Subida de Nivel!')
                        .setDescription(`¡Felicidades ${message.author}! Has alcanzado el nivel ${newLevel}`)
                        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                        .setTimestamp();

                    // Enviar mensaje al canal configurado o al canal actual
                    const targetChannelId = channelId || message.channel.id;
                    const targetChannel = await client.channels.fetch(targetChannelId);

                    if (targetChannel && targetChannel.isTextBased()) {
                        await targetChannel.send({ embeds: [levelUpEmbed] });
                    }
                }

                console.log(`[DEBUG] Nuevo XP: ${newXP}`);
                console.log(`[DEBUG] Nuevo nivel: ${newLevel}`);
                console.log(`[DEBUG] Progreso al siguiente nivel: ${((newXP - XP_FOR_LEVEL(newLevel)) / (XP_FOR_LEVEL(newLevel + 1) - XP_FOR_LEVEL(newLevel)) * 100)}%`);

                // Actualizar base de datos
                await pool.query(
                    'UPDATE user_levels SET xp = $1, level = $2, last_message_timestamp = $3 WHERE user_id = $4 AND guild_id = $5',
                    [newXP, newLevel, now, message.author.id, message.guild.id]
                );

                // Invalidar caché para este usuario
                cacheUtils.invalidate('levels', cacheKey);
            }
        } catch (error) {
            console.error('Error en el sistema de niveles:', error);
        }
    },
};