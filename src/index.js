const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config.json');
const http = require('http');
const dashboard = require('./dashboard/server');
const { initializeJsonFiles } = require('./utils/jsonStorage');

async function initializeBot() {
    try {
        // Inicializar archivos JSON
        console.log('📁 Inicializando sistema de almacenamiento...');
        await initializeJsonFiles();
        console.log('✅ Sistema de almacenamiento inicializado');

        // Verificar configuración
        console.log('🔍 Verificando configuración del bot...');
        // Usar token del ambiente primero, luego del config.json como respaldo
        const token = process.env.DISCORD_BOT_TOKEN || config.token;
        const clientId = process.env.BOT_CLIENT_ID || config.clientId;

        if (!token) {
            throw new Error('Token no encontrado en variables de ambiente ni en config.json');
        }
        if (!clientId) {
            throw new Error('Client ID no encontrado en variables de ambiente ni en config.json');
        }
        console.log('✅ Configuración verificada');

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
        console.log('📂 Cargando comandos...');
        const commandsPath = path.join(__dirname, 'commands');
        const commandFolders = await fs.readdir(commandsPath);

        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            const commandFiles = (await fs.readdir(folderPath)).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`✅ Comando cargado: ${command.data.name}`);
                } else {
                    console.warn(`⚠️ El comando en ${filePath} no tiene las propiedades requeridas`);
                }
            }
        }

        // Cargar eventos
        console.log('📂 Cargando eventos...');
        const eventsPath = path.join(__dirname, 'events');
        const eventFiles = (await fs.readdir(eventsPath)).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);

            if (file === 'monitor.js') {
                if (event.ready) {
                    client.once(event.ready.name, (...args) => event.ready.execute(client, ...args));
                    console.log(`✅ Evento monitor.ready cargado`);
                }
                if (event.interactionCreate) {
                    client.on(event.interactionCreate.name, (...args) => event.interactionCreate.execute(...args));
                    console.log(`✅ Evento monitor.interactionCreate cargado`);
                }
            } else if (file === 'levelSystem.js') {
                client.on('messageCreate', (...args) => event.execute(...args, client));
                console.log(`✅ Evento levelSystem cargado`);
            }
        }

        // Manejar comandos slash
        client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('❌ Error ejecutando comando:', error);
                const errorMessage = error.message || '¡Hubo un error al ejecutar este comando!';

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: `❌ Error: ${errorMessage}`,
                        ephemeral: true
                    });
                }
            }
        });

        // Iniciar el bot
        console.log('🔄 Iniciando sesión del bot...');
        await client.login(token);
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
        global.discordClient = client;
        const server = http.createServer(dashboard);

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

startApplication();