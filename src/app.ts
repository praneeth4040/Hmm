import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import healthRoutes from './features/health/health.routes.js';
import usersRoutes from './features/users/users.routes.js';
import authRoutes from './features/auth/auth.routes.js';
import youtubeRoutes from './features/youtube/youtube.routes.js';
import redditRoutes from './features/reddit/reddit.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { NotFoundError } from './utils/custom-errors.js';

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/storage', express.static('storage'));

// API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/youtube', youtubeRoutes);
app.use('/api/v1/reddit', redditRoutes);

// Catch-all for undefined routes
app.use('*', (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} does not exist`));
});

// Global Error Handler (must be registered last)
app.use(errorHandler);

export default app;
