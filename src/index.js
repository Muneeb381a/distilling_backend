import { cleanEnv, str, port } from 'envalid';
import winston from 'winston';
import app from './app.js';
import {pool} from './config/db.js';

// Logger setup for startup/shutdown
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: 'server.log' }),
    new winston.transports.Console(),
  ],
});

// Validate environment variables
const env = cleanEnv(process.env, {
  PORT: port({ default: 5000, desc: 'Server port' }),
  NODE_ENV: str({ choices: ['development', 'production'], default: 'development' }),
});

// Start server
async function startServer() {
  try {
    // Server startup
    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM. Initiating graceful shutdown.');
      server.close(() => {
        logger.info('Express server closed.');
      });
      await pool.end();
      logger.info('Database pool closed.');
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT. Initiating graceful shutdown.');
      server.close(() => {
        logger.info('Express server closed.');
      });
      await pool.end();
      logger.info('Database pool closed.');
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error({
        message: 'Uncaught exception',
        error: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error({
        message: 'Unhandled promise rejection',
        reason: reason.message || reason,
        promise,
      });
      process.exit(1);
    });
  } catch (err) {
    logger.error({
      message: 'Failed to start server',
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

// Initialize server
startServer();