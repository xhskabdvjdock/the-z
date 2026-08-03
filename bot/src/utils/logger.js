import chalk from 'chalk';

const logger = {
  info: (message) => {
    console.log(chalk.blue(`[INFO] ${new Date().toLocaleString()} - ${message}`));
  },
  success: (message) => {
    console.log(chalk.green(`[SUCCESS] ${new Date().toLocaleString()} - ${message}`));
  },
  error: (message, error) => {
    console.error(chalk.red(`[ERROR] ${new Date().toLocaleString()} - ${message}`));
    if (error) console.error(error);
  },
  warn: (message) => {
    console.warn(chalk.yellow(`[WARN] ${new Date().toLocaleString()} - ${message}`));
  },
  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(chalk.gray(`[DEBUG] ${new Date().toLocaleString()} - ${message}`));
    }
  },
};

export default logger;
