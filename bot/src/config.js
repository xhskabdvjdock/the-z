import dotenv from 'dotenv';
dotenv.config();

export default {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  mongodbUri: process.env.MONGODB_URI,
  apiPort: process.env.API_PORT || 3001,
  apiSecret: process.env.API_SECRET,
  prefix: process.env.BOT_PREFIX || '!',
  nodeEnv: process.env.NODE_ENV || 'development',
};
