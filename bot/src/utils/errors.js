import logger from './logger.js';

export class BotError extends Error {
  constructor(message, code = 'BOT_ERROR') {
    super(message);
    this.name = 'BotError';
    this.code = code;
    logger.error(`BotError [${code}]: ${message}`);
  }
}

export class DatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseError';
    logger.error(`DatabaseError: ${message}`);
  }
}

export class PermissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermissionError';
    logger.warn(`PermissionError: ${message}`);
  }
}

export const handleError = (error, interaction = null) => {
  logger.error('Unhandled error:', error);
  
  if (interaction) {
    if (interaction.replied || interaction.deferred) {
      interaction.followUp({ 
        content: '❌ حدث خطأ أثناء تنفيذ الأمر', 
        ephemeral: true 
      }).catch(() => {});
    } else {
      interaction.reply({ 
        content: '❌ حدث خطأ أثناء تنفيذ الأمر', 
        ephemeral: true 
      }).catch(() => {});
    }
  }
};
