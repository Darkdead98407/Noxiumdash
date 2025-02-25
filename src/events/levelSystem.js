const { EmbedBuilder } = require('discord.js');
const { levelStorage } = require('../utils/jsonStorage');
const cacheUtils = require('../utils/cache');

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
                return await levelStorage.getUserLevel(message.author.id, message.guild.id);
            });

            const lastMessage = userData.last_message_timestamp ? new Date(userData.last_message_timestamp) : new Date(0);
            if (now - lastMessage >= XP_COOLDOWN) {
                // Calcular XP basado en el nivel actual
                const currentLevel = userData.level;
                const xpGainPercentage = getXPPerMessage(currentLevel);
                const nextLevelXP = XP_FOR_LEVEL(currentLevel + 1);
                const currentLevelXP = XP_FOR_LEVEL(currentLevel);
                const xpNeeded = nextLevelXP - currentLevelXP;
                const xpGain = Math.floor((xpNeeded * xpGainPercentage) / 100);

                // Actualizar XP
                const newXP = userData.xp + xpGain;
                let newLevel = currentLevel;

                // Verificar si subió de nivel
                while (newXP >= XP_FOR_LEVEL(newLevel + 1)) {
                    newLevel++;

                    // Obtener el canal configurado para las notificaciones de nivel
                    const channelId = await cacheUtils.getOrSet('channels', `level_${message.guild.id}`, async () => {
                        return await levelStorage.getLevelChannel(message.guild.id);
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

                // Actualizar datos del usuario
                const updatedUserData = {
                    xp: newXP,
                    level: newLevel,
                    last_message_timestamp: now
                };

                await levelStorage.updateUserLevel(message.author.id, message.guild.id, updatedUserData);
                cacheUtils.invalidate('levels', cacheKey);
            }
        } catch (error) {
            console.error('Error en el sistema de niveles:', error);
        }
    },
};