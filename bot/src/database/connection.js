import mongoose from 'mongoose';
import config from '../config.js';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.success('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB error:', error);
});

export default connectDB;
