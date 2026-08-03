import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class EventHandler {
  constructor(client) {
    this.client = client;
  }

  async loadEvents() {
    try {
      const eventsPath = join(__dirname, '../events');
      const files = (await readdir(eventsPath)).filter(file => 
        file.endsWith('.js')
      );

      for (const file of files) {
        try {
          const filePath = join(eventsPath, file);
          const { default: event } = await import(`file://${filePath}`);
          
          if (event && event.name && event.execute) {
            if (event.once) {
              this.client.once(event.name, (...args) => event.execute(...args, this.client));
            } else {
              this.client.on(event.name, (...args) => event.execute(...args, this.client));
            }
            logger.debug(`Loaded event: ${event.name}`);
          }
        } catch (error) {
          logger.error(`Error loading event ${file}:`, error);
        }
      }

      logger.success('Loaded all events');
    } catch (error) {
      logger.error('Error loading events:', error);
    }
  }
}

export default EventHandler;
