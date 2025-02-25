const { EmbedBuilder } = require('discord.js');
const cacheUtils = require('../utils/cache');

// Almacenar estadísticas de comandos
const commandStats = {
    totalCommands: 0,
    commandsUsed: new Map(), // Mapa para contar uso de cada comando
    lastUpdate: Date.now()
};

module.exports = {
    ready: {
        name: 'ready',
        once: true,
        async execute(client) {
            const MONITOR_CHANNEL_ID = '1343692396008837130';
            console.log('🔍 Buscando canal de monitoreo:', MONITOR_CHANNEL_ID);

            try {
                const monitorChannel = await client.channels.fetch(MONITOR_CHANNEL_ID)
                    .catch(error => {
                        console.error('❌ Error al buscar canal:', error.message);
                        return null;
                    });

                if (!monitorChannel) {
                    console.error('❌ Canal de monitoreo no encontrado. Verifica el ID del canal y los permisos del bot.');
                    return;
                }

                if (!monitorChannel.isTextBased()) {
                    console.error('❌ El canal no es un canal de texto');
                    return;
                }

                console.log('✅ Canal de monitoreo encontrado:', monitorChannel.name);
                console.log('✅ Sistema de monitoreo iniciado');

                // Función para crear/actualizar el mensaje de estado
                async function updateStatusMessage() {
                    console.log('📊 Actualizando mensaje de estado...');
                    const uptimeInSeconds = Math.floor(client.uptime / 1000);
                    const memoryUsage = process.memoryUsage();
                    const cacheStats = {
                        levels: cacheUtils.getStats('levels'),
                        channels: cacheUtils.getStats('channels'),
                        commands: cacheUtils.getStats('commands')
                    };

                    // Crear lista de comandos usados
                    const commandList = Array.from(commandStats.commandsUsed.entries())
                        .map(([cmd, count]) => `/${cmd}: ${count} veces`)
                        .join('\n');

                    const statsEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('📊 Estado del Bot')
                        .addFields(
                            { name: '⚡ Estado', value: client.isReady() ? '🟢 En línea' : '🔴 Desconectado', inline: true },
                            { name: '⏰ Tiempo Activo', value: `${Math.floor(uptimeInSeconds / 3600)}h ${Math.floor((uptimeInSeconds % 3600) / 60)}m ${uptimeInSeconds % 60}s`, inline: true },
                            { name: '🏓 Latencia', value: `${client.ws.ping}ms`, inline: true },
                            { name: '💾 Uso de Memoria', value: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`, inline: true },
                            { name: '🌐 Servidores', value: `${client.guilds.cache.size}`, inline: true },
                            { name: '👥 Usuarios', value: `${client.users.cache.size}`, inline: true },
                            { name: '📦 Caché Niveles', value: `${cacheStats.levels.hits}/${cacheStats.levels.misses} (${cacheStats.levels.keys} claves)`, inline: true },
                            { name: '📦 Caché Canales', value: `${cacheStats.channels.hits}/${cacheStats.channels.misses} (${cacheStats.channels.keys} claves)`, inline: true },
                            { name: '📈 Tasa de Aciertos', value: `${calculateHitRate(cacheStats)}%`, inline: true },
                            { name: '🔍 Comandos Registrados', value: `Total: ${commandStats.totalCommands}\n\n${commandList || 'Ninguno'}`, inline: false }
                        )
                        .setTimestamp();

                    try {
                        // Buscar mensaje anterior de estadísticas para actualizarlo
                        const messages = await monitorChannel.messages.fetch({ limit: 10 });
                        console.log('🔍 Buscando mensaje anterior de estadísticas...');

                        const statsMessage = messages.find(m =>
                            m.author.id === client.user.id &&
                            m.embeds[0]?.title === '📊 Estado del Bot'
                        );

                        if (statsMessage) {
                            console.log('✏️ Actualizando mensaje existente');
                            await statsMessage.edit({ embeds: [statsEmbed] });
                        } else {
                            console.log('📝 Creando nuevo mensaje de estado');
                            await monitorChannel.send({ embeds: [statsEmbed] });
                        }
                        console.log('✅ Mensaje de estado actualizado');
                    } catch (error) {
                        console.error('❌ Error al actualizar mensaje:', error.message);
                    }
                }

                // Actualizar inmediatamente al iniciar
                console.log('🚀 Iniciando primera actualización...');
                await updateStatusMessage();

                // Configurar intervalo de actualización cada segundo
                client.statsInterval = setInterval(updateStatusMessage, 1000);
                console.log('⏰ Intervalo de actualización configurado (1 segundo)');
            } catch (error) {
                console.error('❌ Error en el sistema de monitoreo:', error);
            }
        }
    },
    interactionCreate: {
        name: 'interactionCreate',
        execute(interaction) {
            if (!interaction.isChatInputCommand()) return;

            // Actualizar estadísticas de comandos
            commandStats.totalCommands++;
            const currentCount = commandStats.commandsUsed.get(interaction.commandName) || 0;
            commandStats.commandsUsed.set(interaction.commandName, currentCount + 1);
        }
    }
};

// Función para calcular la tasa de aciertos del caché
function calculateHitRate(cacheStats) {
    let totalHits = 0;
    let totalRequests = 0;

    Object.values(cacheStats).forEach(stats => {
        totalHits += stats.hits;
        totalRequests += stats.hits + stats.misses;
    });

    return totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(1) : '0.0';
}