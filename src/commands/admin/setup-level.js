const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-nivel')
        .setDescription('Configura el canal para mostrar las subidas de nivel')
        .addChannelOption(option =>
            option
                .setName('canal')
                .setDescription('Canal donde se mostrarán las subidas de nivel')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('canal');
        const guildId = interaction.guild.id;

        try {
            // Verificar permisos del bot en el canal
            const permissions = channel.permissionsFor(interaction.client.user);
            if (!permissions.has('SendMessages')) {
                return interaction.reply({
                    content: '❌ No tengo permisos para enviar mensajes en ese canal.',
                    ephemeral: true
                });
            }

            // Actualizar o insertar la configuración en la base de datos
            await pool.query(
                'INSERT INTO level_channels (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2',
                [guildId, channel.id]
            );

            await interaction.reply({
                content: `✅ Canal de niveles configurado en ${channel}.\nLas notificaciones de subida de nivel se mostrarán en este canal.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error al configurar canal de niveles:', error);
            await interaction.reply({
                content: '❌ Hubo un error al configurar el canal de niveles.',
                ephemeral: true
            });
        }
    },
};