import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import healthRoutes from './features/health/health.routes.js';
import usersRoutes from './features/users/users.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { NotFoundError } from './utils/custom-errors.js';

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/users', usersRoutes);

// Catch-all for undefined routes
app.use('*', (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} does not exist`));
});

// Global Error Handler (must be registered last)
app.use(errorHandler);

export default app;
