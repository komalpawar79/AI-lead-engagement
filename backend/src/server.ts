import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

import logger from './utils/logger';
import apiRouter from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows React development
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl/fetch) or any localhost/local network
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Dev permissive
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes
app.use('/api', apiRouter);

// Serve compiled React frontend if present
const possibleDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
];
const frontendDistPath = possibleDistPaths.find((p) => fs.existsSync(p));

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
  logger.info(`Serving compiled frontend from: ${frontendDistPath}`);
}

// Global Error Handler
app.use(errorHandler);

// Start Server
const server = app.listen(PORT, () => {
  logger.info(`=================================================`);
  logger.info(`🚀 AI LeadEngage Backend Server`);
  logger.info(`   "Smarter Leads. Faster Sales."`);
  logger.info(`📡 API Running at: http://localhost:${PORT}/api`);
  logger.info(`🛠️ Mode: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`=================================================`);
});

// Handle graceful shutdown
const shutdown = () => {
  logger.info('Shutting down server gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;

