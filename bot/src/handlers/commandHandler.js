import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { handleError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CommandHandler {
  constructor(client) {
    this.client = client;
    this.commands = new Map();
  }

  async loadCommands() {
    try {
      const commandsPath = join(__dirname, '../commands');
      const categories = await readdir(commandsPath);

      for (const category of categories) {
        const categoryPath = join(commandsPath, category);
        const files = (await readdir(categoryPath)).filter(file => 
          file.endsWith('.js')
        );

        for (const file of files) {
          try {
            const filePath = join(categoryPath, file);
            const { default: command } = await import(`file://${filePath}`);
            
            if (command && command.data && command.execute) {
              this.commands.set(command.data.name, command);
              logger.debug(`Loaded command: ${command.data.name}`);
            }
          } catch (error) {
            logger.error(`Error loading command ${file}:`, error);
          }
        }
      }

      logger.success(`Loaded ${this.commands.size} commands`);
    } catch (error) {
      logger.error('Error loading commands:', error);
    }
  }

  async registerCommands() {
    try {
      const commands = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
      
      if (this.client.application) {
        await this.client.application.commands.set(commands);
        logger.success('Registered slash commands globally');
      }
    } catch (error) {
      logger.error('Error registering commands:', error);
    }
  }

  async handleInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Command not found: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      handleError(error, interaction);
    }
  }

  getCommand(name) {
    return this.commands.get(name);
  }

  getAllCommands() {
    return Array.from(this.commands.values());
  }
}

export default CommandHandler;
