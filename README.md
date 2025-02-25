# Bot de Discord

Este es un bot de Discord que puede funcionar en múltiples servidores.

## Configuración Inicial

1. Ve al [Portal de Desarrolladores de Discord](https://discord.com/developers/applications)
2. Crea una nueva aplicación
3. En la sección "Bot":
   - Crea un nuevo bot
   - Activa los siguientes permisos:
     - PRESENCIA DE INTENCIÓN
     - INTENCIÓN DE MIEMBROS DEL SERVIDOR
     - INTENCIÓN DE CONTENIDO DE MENSAJE

4. Copia las credenciales:
   - ID DE APLICACIÓN (será tu clientId)
   - TOKEN DEL BOT (será tu token)
   - CLIENT SECRET (será tu clientSecret)

5. Configura el archivo `config.json`:
```json
{
    "token": "TU_TOKEN_AQUÍ",
    "clientId": "TU_CLIENT_ID_AQUÍ",
    "clientSecret": "TU_CLIENT_SECRET_AQUÍ"
}
```

⚠️ IMPORTANTE: Nunca subas tu token real a GitHub. El token es como una contraseña y debe mantenerse seguro.
Puedes usar variables de ambiente para mayor seguridad:
- DISCORD_BOT_TOKEN
- BOT_CLIENT_ID
- DISCORD_CLIENT_SECRET

## Sincronización con VSCode Local

Para trabajar con este proyecto en tu VSCode local:

1. En Replit, haz clic en el botón "Tools" en la barra lateral
2. Selecciona "Git"
3. Conecta tu cuenta de GitHub si no lo has hecho
4. Haz clic en "Create a Git repo" para inicializar el repositorio
5. Realiza tu primer commit con todos los archivos
6. Copia la URL del repositorio

En tu PC local:

1. Abre VSCode
2. Presiona Ctrl+Shift+P (o Cmd+Shift+P en Mac)
3. Escribe "Git: Clone" y presiona Enter
4. Pega la URL del repositorio que copiaste
5. Selecciona una carpeta local para el proyecto
6. Espera a que se complete la clonación

Para mantener sincronizado:

- En Replit: Haz commit y push de tus cambios regularmente
- En VSCode local: Usa pull para obtener los últimos cambios
- Para subir cambios: Haz commit y push desde VSCode

## Comandos Disponibles

- `/ping` - Muestra la latencia del bot
- `/servidor` - Muestra información sobre el servidor actual
- `/nivel` - Muestra tu nivel y experiencia actual
- `/avatar` - Muestra el avatar de un usuario
- `/borrar` - Borra mensajes del canal (requiere permisos)
- `/purgar` - Purga todos los mensajes del canal (requiere permisos)
- `/setup-nivel` - Configura el canal para notificaciones de nivel

## Estructura del Proyecto

```
src/
├── commands/         # Comandos del bot
│   ├── admin/       # Comandos administrativos
│   └── utility/     # Comandos de utilidad
├── events/          # Eventos del bot
├── utils/           # Utilidades y herramientas
├── data/           # Almacenamiento JSON
├── dashboard/       # Panel de control web
└── index.js         # Archivo principal del bot
```

## Cómo Agregar Nuevos Comandos

1. Crea un nuevo archivo en la carpeta `commands` correspondiente
2. Usa esta estructura básica:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nombre-comando')
        .setDescription('Descripción del comando'),
    async execute(interaction) {
        // Código del comando
    },
};
```

## Iniciar el Bot

1. Instala las dependencias:
```bash
npm install
```

2. Registra los comandos:
```bash
node src/deploy-commands.js
```

3. Inicia el bot:
```bash
node src/index.js
```

## Gestión de Comandos

Para eliminar todos los comandos registrados:
```bash
node src/unregister-commands.js
```

## Soporte

Si encuentras algún problema, asegúrate de:
1. Tener todas las intenciones (Intents) activadas en el portal de Discord
2. Haber invitado al bot con los permisos correctos
3. Tener el archivo config.json configurado correctamente con el token y clientId válidos