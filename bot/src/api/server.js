import express from 'express';
import cors from 'cors';
import config from '../config.js';
import logger from '../utils/logger.js';
import Guild from '../models/Guild.js';
import Ticket from '../models/Ticket.js';
import Warning from '../models/Warning.js';
import Application from '../models/Application.js';
import Rating from '../models/Rating.js';
import Giveaway from '../models/Giveaway.js';
import Log from '../models/Log.js';

const app = express();

app.use(cors());
app.use(express.json());

// Middleware for API secret
const apiAuth = (req, res, next) => {
  const apiSecret = req.headers['x-api-secret'];
  if (apiSecret !== config.apiSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Get all guilds
app.get('/api/guilds', apiAuth, async (req, res) => {
  try {
    const guilds = await Guild.find({});
    res.json(guilds);
  } catch (error) {
    logger.error('API Error getting guilds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get guild by ID
app.get('/api/guild/:id', apiAuth, async (req, res) => {
  try {
    const guild = await Guild.findOne({ guildId: req.params.id });
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    res.json(guild);
  } catch (error) {
    logger.error('API Error getting guild:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update guild settings
app.post('/api/guild/:id/settings', apiAuth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const updates = req.body;
    
    // Merge updates with existing settings
    const existingGuild = await Guild.findOne({ guildId });
    const mergedSettings = existingGuild 
      ? { ...existingGuild.toObject(), ...updates }
      : { guildId, ...updates };
    
    // Remove _id and __v for clean update
    delete mergedSettings._id;
    delete mergedSettings.__v;
    
    const guild = await Guild.findOneAndUpdate(
      { guildId },
      { $set: mergedSettings },
      { new: true, upsert: true }
    );
    
    logger.info(`Updated settings for guild ${guildId}`);
    res.json(guild);
  } catch (error) {
    logger.error('API Error updating guild:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get guild stats
app.get('/api/guild/:id/stats', apiAuth, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    const [tickets, warnings, applications, ratings, giveaways, logs] = await Promise.all([
      Ticket.countDocuments({ guildId }),
      Warning.countDocuments({ guildId, active: true }),
      Application.countDocuments({ guildId, status: 'pending' }),
      Rating.countDocuments({ guildId }),
      Giveaway.countDocuments({ guildId, ended: false }),
      Log.countDocuments({ guildId }),
    ]);

    res.json({
      tickets,
      warnings,
      applications,
      ratings,
      giveaways,
      logs,
    });
  } catch (error) {
    logger.error('API Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tickets
app.get('/api/guild/:id/tickets', apiAuth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ guildId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(tickets);
  } catch (error) {
    logger.error('API Error getting tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get logs
app.get('/api/guild/:id/logs', apiAuth, async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    const query = { guildId: req.params.id };
    if (type) query.type = type;

    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    res.json(logs);
  } catch (error) {
    logger.error('API Error getting logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const startAPI = () => {
  // Root endpoint
  app.get('/', (req, res) => {
    res.json({ 
      status: 'online', 
      message: 'Discord Bot API is running',
      version: '1.0.0',
      endpoints: {
        guilds: '/api/guilds',
        guild: '/api/guild/:id',
        stats: '/api/guild/:id/stats',
        tickets: '/api/guild/:id/tickets',
        logs: '/api/guild/:id/logs'
      }
    });
  });

  app.listen(config.apiPort, () => {
    logger.success(`API server running on port ${config.apiPort}`);
  });
};

export default startAPI;
