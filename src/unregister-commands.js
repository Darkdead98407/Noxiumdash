const { REST, Routes } = require('discord.js');
const config = require('../config.json');

async function unregisterCommands() {
    try {
        console.log('🔄 Iniciando proceso de eliminación de comandos...');
        console.log('🔑 Client ID:', config.clientId);

        // Configurar REST API
        const rest = new REST({ version: '10' }).setToken(config.token);

        // Eliminar todos los comandos globales
        await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
        
        console.log('✅ Todos los comandos globales han sido eliminados exitosamente');
    } catch (error) {
        console.error('❌ Error al eliminar comandos:', error);
    }
}

// Ejecutar la función
console.log('🚀 Iniciando script de eliminación de comandos...');
unregisterCommands();
