import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { Player } from 'discord-player';
import config from './config.js';
import connectDB from './database/connection.js';
import CommandHandler from './handlers/commandHandler.js';
import EventHandler from './handlers/eventHandler.js';
import logger from './utils/logger.js';
import startAPI from './api/server.js';

// Create Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

// Initialize handlers
const commandHandler = new CommandHandler(client);
const eventHandler = new EventHandler(client);

// Attach handlers to client
client.commands = commandHandler;
client.events = eventHandler;

// Initialize bot
async function init() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Discord Player
    const player = new Player(client, {
      ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
      },
    });

    await player.extractors.loadDefault();
    client.player = player;

    // Start API server
    startAPI();

    // Start Reminder System
    const { ReminderManager } = await import('./systems/reminders/reminderManager.js');
    await ReminderManager.startReminderSystem(client);


    // Load events
    await eventHandler.loadEvents();

    // Load commands
    await commandHandler.loadCommands();

    // Login to Discord
    await client.login(config.token);

    // Register commands after ready
    client.once('ready', async () => {
      await commandHandler.registerCommands();
      logger.success('Bot is ready!');
    });

    // Handle interactions
    client.on('interactionCreate', async (interaction) => {
      await commandHandler.handleInteraction(interaction);
    });

  } catch (error) {
    logger.error('Failed to initialize bot:', error);
    process.exit(1);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Start bot
init();

export default client;
