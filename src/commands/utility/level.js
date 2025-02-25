const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');
const cacheUtils = require('../../utils/cache');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

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

            // Obtener datos del usuario del caché o la base de datos
            const userLevel = await cacheUtils.getOrSet('levels', cacheKey, async () => {
                const result = await pool.query(
                    'SELECT * FROM user_levels WHERE user_id = $1 AND guild_id = $2',
                    [targetUser.id, guildId]
                );
                return result.rows[0];
            });

            if (!userLevel) {
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

            console.log(`[DEBUG] Comando nivel - Usuario: ${targetUser.tag}`);
            console.log(`[DEBUG] XP total: ${userLevel.xp}`);
            console.log(`[DEBUG] XP en este nivel: ${currentXPInLevel}`);
            console.log(`[DEBUG] XP necesario para siguiente nivel: ${xpForNextLevel}`);
            console.log(`[DEBUG] Progreso calculado: ${progress}%`);

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