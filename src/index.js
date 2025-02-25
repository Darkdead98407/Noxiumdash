const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config.json');
const http = require('http');
const dashboard = require('./dashboard/server');

async function initializeBot() {
    try {
        // Verificar configuración
        console.log('🔍 Verificando configuración...');
        if (!config.token || !config.clientId) {
            throw new Error('Token o Client ID no encontrados en config.json');
        }

        // Crear cliente de Discord
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences
            ]
        });

        // Colección para almacenar comandos
        client.commands = new Collection();

        // Cargar comandos
        const commandsPath = path.join(__dirname, 'commands');
        const commandFolders = await fs.readdir(commandsPath);
        console.log('📂 Cargando comandos...');

        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            const commandFiles = (await fs.readdir(folderPath)).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`✅ Comando cargado: ${command.data.name}`);
                }
            }
        }

        // Cargar eventos
        const eventsPath = path.join(__dirname, 'events');
        const eventFiles = (await fs.readdir(eventsPath)).filter(file => file.endsWith('.js'));
        console.log('📂 Cargando eventos...');

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            console.log(`✅ Evento cargado: ${event.name}`);
        }

        // Manejar comandos slash
        client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: '¡Hubo un error al ejecutar este comando!',
                    ephemeral: true
                });
            }
        });

        // Iniciar el bot
        await client.login(config.token);
        console.log('✅ Bot conectado exitosamente');

        return client;
    } catch (error) {
        console.error('❌ Error al inicializar el bot:', error);
        throw error;
    }
}

async function initializeDashboard(client) {
    try {
        console.log('🌐 Iniciando servidor del dashboard...');

        // Hacer el cliente disponible globalmente
        global.discordClient = client;

        // Crear servidor HTTP
        const server = http.createServer(dashboard);

        // Iniciar el servidor
        await new Promise((resolve, reject) => {
            server.listen(5000, '0.0.0.0', () => {
                console.log('✅ Dashboard iniciado en puerto 5000');
                resolve();
            });

            server.on('error', (error) => {
                console.error('❌ Error al iniciar el servidor:', error);
                reject(error);
            });
        });

        return server;
    } catch (error) {
        console.error('❌ Error al inicializar el dashboard:', error);
        throw error;
    }
}

async function startApplication() {
    try {
        console.log('🚀 Iniciando aplicación...');

        const client = await initializeBot();
        await initializeDashboard(client);

        console.log('✅ Aplicación iniciada completamente');
    } catch (error) {
        console.error('❌ Error fatal al iniciar la aplicación:', error);
        process.exit(1);
    }
}

// Iniciar la aplicación
startApplication();