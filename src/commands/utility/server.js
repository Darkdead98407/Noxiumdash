const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servidor')
        .setDescription('Muestra información sobre el servidor'),
    async execute(interaction) {
        const server = interaction.guild;

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Información de ${server.name}`)
            .setThumbnail(server.iconURL())
            .addFields(
                { name: '👥 Miembros', value: `${server.memberCount}`, inline: true },
                { name: '📅 Creado', value: `<t:${Math.floor(server.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👑 Dueño', value: `<@${server.ownerId}>`, inline: true },
                { name: '💬 Canales', value: `${server.channels.cache.size}`, inline: true },
                { name: '🎭 Roles', value: `${server.roles.cache.size}`, inline: true }
            )
            .setFooter({ text: `ID: ${server.id}` });

        await interaction.reply({ embeds: [embed] });
    },
};