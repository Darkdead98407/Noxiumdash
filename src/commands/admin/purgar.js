const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purgar')
        .setDescription('Borra todos los mensajes del canal, incluso los antiguos')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Verificar permisos del bot
            if (!interaction.channel.permissionsFor(interaction.client.user).has('ManageMessages')) {
                return interaction.reply({
                    content: '❌ No tengo permisos para borrar mensajes en este canal.',
                    ephemeral: true
                });
            }

            // Diferir la respuesta ya que esto tomará tiempo
            await interaction.deferReply({ ephemeral: true });

            let mensajesBorrados = 0;
            let continuar = true;
            let tiempoInicio = Date.now();
            let ultimoMensajeId = null;

            while (continuar) {
                // Obtener mensajes en lotes de 100, usando paginación
                const options = { limit: 100 };
                if (ultimoMensajeId) {
                    options.before = ultimoMensajeId;
                }

                const messages = await interaction.channel.messages.fetch(options);
                console.log(`[DEBUG] Lote actual: ${messages.size} mensajes${ultimoMensajeId ? ` antes de ${ultimoMensajeId}` : ''}`);

                if (messages.size === 0) {
                    continuar = false;
                    break;
                }

                // Guardar el ID del último mensaje para la siguiente iteración
                ultimoMensajeId = messages.last().id;

                // Separar mensajes recientes y antiguos
                const now = Date.now();
                const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
                const mensajesRecientes = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
                const mensajesAntiguos = messages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

                console.log(`[DEBUG] Mensajes recientes: ${mensajesRecientes.size}, antiguos: ${mensajesAntiguos.size}`);

                // Borrar mensajes recientes en lote si hay alguno
                if (mensajesRecientes.size > 0) {
                    try {
                        const borrados = await interaction.channel.bulkDelete(mensajesRecientes, true);
                        mensajesBorrados += borrados.size;

                        // Actualizar progreso
                        await interaction.editReply({
                            content: `🗑️ Borrando mensajes... ${mensajesBorrados} mensajes eliminados.`,
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Error al borrar mensajes recientes:', error);
                    }
                }

                // Borrar mensajes antiguos individualmente
                for (const message of mensajesAntiguos.values()) {
                    try {
                        await message.delete();
                        mensajesBorrados++;

                        // Actualizar el progreso cada 10 mensajes
                        if (mensajesBorrados % 10 === 0) {
                            const tiempoTranscurrido = ((Date.now() - tiempoInicio) / 1000).toFixed(1);
                            const velocidad = (mensajesBorrados / tiempoTranscurrido).toFixed(1);
                            await interaction.editReply({
                                content: `🗑️ Borrando mensajes...\n${mensajesBorrados} mensajes eliminados.\nVelocidad: ${velocidad} mensajes/segundo\nTiempo: ${tiempoTranscurrido}s`,
                                ephemeral: true
                            });
                        }
                    } catch (error) {
                        console.error(`Error al borrar mensaje ${message.id}:`, error);
                        continue;
                    }

                    // Pequeña pausa para evitar límites de rate
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            // Mensaje final
            const tiempoTotal = ((Date.now() - tiempoInicio) / 1000).toFixed(1);
            const velocidadPromedio = (mensajesBorrados / tiempoTotal).toFixed(1);
            await interaction.editReply({
                content: `✅ Operación completada.\nSe han borrado ${mensajesBorrados} mensajes.\nTiempo total: ${tiempoTotal}s\nVelocidad promedio: ${velocidadPromedio} mensajes/segundo`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error en comando purgar:', error);
            const errorMessage = error.message || 'Hubo un error al purgar los mensajes.';

            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ Error: ${errorMessage}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ Error: ${errorMessage}`,
                    ephemeral: true
                });
            }
        }
    },
};