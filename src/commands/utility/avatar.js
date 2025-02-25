const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Muestra el avatar de un usuario')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario del que quieres ver el avatar')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        const avatarUrl = user.displayAvatarURL({ size: 4096, dynamic: true });

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Avatar de ${user.username}`)
            .setImage(avatarUrl)
            .setDescription(`[Enlace directo al avatar](${avatarUrl})`)
            .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
