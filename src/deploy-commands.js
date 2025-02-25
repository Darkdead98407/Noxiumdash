const { REST, Routes } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config.json');

async function deployCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');

    try {
        console.log('🔄 Iniciando registro de comandos globales...');
        console.log(`📂 Directorio de comandos: ${commandsPath}`);

        // Obtener todos los subdirectorios de comandos
        const commandFolders = await fs.readdir(commandsPath);

        // Cargar comandos desde cada subcarpeta
        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            const commandFiles = (await fs.readdir(folderPath)).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    const commandData = command.data.toJSON();
                    commands.push(commandData);
                    console.log(`✅ Comando preparado: ${command.data.name} desde ${folder}/${file}`);
                }
            }
        }

        // Configurar REST API
        const rest = new REST({ version: '10' }).setToken(config.token);

        console.log(`📝 Registrando ${commands.length} comandos globalmente...`);
        console.log('🔑 Client ID:', config.clientId);

        // Primero, eliminar todos los comandos globales existentes
        await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
        console.log('🗑️ Comandos globales anteriores eliminados');

        // Registrar los nuevos comandos globalmente
        const data = await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        );

        console.log('✅ Comandos registrados exitosamente de forma global');
        console.log(`📊 Total comandos registrados: ${data.length}`);
        console.log('📋 Lista de comandos registrados:', commands.map(cmd => cmd.name).join(', '));
    } catch (error) {
        console.error('❌ Error al registrar comandos:', error);
    }
}

deployCommands();