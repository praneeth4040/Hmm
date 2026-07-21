import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    logger.info('Connecting to database...');
    // Verify connection is healthy
    await prisma.$connect();
    logger.info('Database connection verified successfully.');

    const port = env.PORT;
    const server = app.listen(port, () => {
      logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${port}`);
    });

    // Handle graceful shutdown signals
    const shutdown = async () => {
      logger.info('SIGTERM/SIGINT received. Shutting down server gracefully...');
      server.close(async () => {
        logger.info('HTTP server closed.');
        await prisma.$disconnect();
        logger.info('Database connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Fatal: Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
