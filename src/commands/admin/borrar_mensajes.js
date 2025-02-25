const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('borrar')
        .setDescription('Borra 100 mensajes del canal actual, incluyendo mensajes de bots')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            // Verificar permisos del bot
            if (!interaction.channel.permissionsFor(interaction.client.user).has('ManageMessages')) {
                return interaction.reply({
                    content: '❌ No tengo permisos para borrar mensajes en este canal.',
                    ephemeral: true
                });
            }

            // Diferir la respuesta ya que puede tomar tiempo
            await interaction.deferReply({ ephemeral: true });

            // Verificar cuántos mensajes hay en el canal
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            console.log(`[DEBUG] Mensajes encontrados: ${messages.size}`);

            if (messages.size === 0) {
                return interaction.editReply({
                    content: '❌ No hay mensajes para borrar en este canal.',
                    ephemeral: true
                });
            }

            // Filtrar mensajes por antigüedad
            const now = Date.now();
            const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
            const mensajesRecientes = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            const mensajesAntiguos = messages.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

            console.log(`[DEBUG] Mensajes recientes: ${mensajesRecientes.size}`);
            console.log(`[DEBUG] Mensajes antiguos: ${mensajesAntiguos.size}`);

            // Intentar borrar mensajes hasta 3 veces si es necesario
            let mensajesBorrados;
            let intentos = 0;
            const maxIntentos = 3;

            while (intentos < maxIntentos) {
                try {
                    mensajesBorrados = await interaction.channel.bulkDelete(mensajesRecientes, true);
                    console.log(`[DEBUG] Intento ${intentos + 1}: Mensajes borrados: ${mensajesBorrados.size}`);
                    break;
                } catch (error) {
                    intentos++;
                    console.error(`[DEBUG] Error en intento ${intentos}:`, error);
                    if (intentos === maxIntentos) {
                        throw new Error('No se pudieron borrar algunos mensajes después de varios intentos.');
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo entre intentos
                }
            }

            // Verificar si quedaron mensajes después del borrado
            const mensajesRestantes = await interaction.channel.messages.fetch({ limit: 1 });
            console.log(`[DEBUG] Mensajes restantes: ${mensajesRestantes.size}`);

            // Preparar mensaje de respuesta
            let mensaje = `✅ Se han borrado ${mensajesBorrados ? mensajesBorrados.size : 0} mensajes.`;

            if (mensajesAntiguos.size > 0) {
                mensaje += `\n⚠️ ${mensajesAntiguos.size} mensajes no se pudieron borrar por ser más antiguos de 14 días.`;
            }

            if (mensajesRestantes.size > 0 && (mensajesBorrados === undefined || mensajesBorrados.size === 0)) {
                mensaje = '⚠️ No se pudo borrar ningún mensaje. Es posible que todos sean muy antiguos (más de 14 días).';
            }

            // Responder con el resultado
            await interaction.editReply({
                content: mensaje,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error en comando borrar:', error);
            const errorMessage = error.message || 'Hubo un error al borrar los mensajes.';

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