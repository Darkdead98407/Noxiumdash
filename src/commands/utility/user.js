const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Muestra información detallada de un usuario')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario del que quieres ver la información')
                .setRequired(false)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id);
        
        const status = {
            online: '🟢 En línea',
            idle: '🟡 Ausente',
            dnd: '🔴 No molestar',
            offline: '⚫ Desconectado'
        };

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`Información de ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: '👤 Usuario', value: `${targetUser.tag}`, inline: true },
                { name: '🆔 ID', value: targetUser.id, inline: true },
                { name: '📅 Cuenta Creada', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Se unió al servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🎭 Roles', value: member.roles.cache.map(role => role.toString()).join(', ') || 'Sin roles', inline: false },
                { name: '🎮 Estado', value: status[member.presence?.status || 'offline'], inline: true },
                { name: '🤖 Bot', value: targetUser.bot ? 'Sí' : 'No', inline: true }
            )
            .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
