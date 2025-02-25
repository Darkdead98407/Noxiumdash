const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { levelStorage } = require('../../utils/jsonStorage');
const cacheUtils = require('../../utils/cache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nivel')
        .setDescription('Muestra tu nivel y experiencia actual')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('Usuario del que quieres ver el nivel')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const guildId = interaction.guild.id;

        try {
            const cacheKey = `${targetUser.id}_${guildId}`;

            // Obtener datos del usuario del caché o almacenamiento
            const userLevel = await cacheUtils.getOrSet('levels', cacheKey, async () => {
                return await levelStorage.getUserLevel(targetUser.id, guildId);
            });

            if (!userLevel || (userLevel.xp === 0 && userLevel.level === 0)) {
                return interaction.reply({
                    content: `${targetUser.username} aún no tiene experiencia en este servidor.`,
                    ephemeral: true
                });
            }

            const nextLevelXP = 100 * Math.pow(userLevel.level + 1, 1.5);
            const currentLevelXP = 100 * Math.pow(userLevel.level, 1.5);
            const xpForNextLevel = Math.floor(nextLevelXP - currentLevelXP);
            const currentXPInLevel = Math.floor(userLevel.xp - currentLevelXP);
            const progress = (currentXPInLevel / xpForNextLevel) * 100;

            const levelEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`Nivel de ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '📊 Nivel', value: `${userLevel.level}`, inline: true },
                    { name: '✨ XP', value: `${currentXPInLevel}/${xpForNextLevel}`, inline: true },
                    { name: '📈 Progreso', value: createProgressBar(progress) }
                )
                .setFooter({ text: `ID: ${targetUser.id}` })
                .setTimestamp();

            await interaction.reply({ embeds: [levelEmbed] });
        } catch (error) {
            console.error('Error al obtener nivel:', error);
            await interaction.reply({
                content: 'Hubo un error al obtener la información de nivel.',
                ephemeral: true
            });
        }
    },
};

function createProgressBar(progress) {
    const filled = Math.floor(progress / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.floor(progress)}%`;
}