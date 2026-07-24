import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import healthRoutes from './features/health/health.routes.js';
import usersRoutes from './features/users/users.routes.js';
import authRoutes from './features/auth/auth.routes.js';
import youtubeRoutes from './features/youtube/youtube.routes.js';
import videoRoutes from './features/video/video.routes.js';
import narrationRoutes from './features/narration/narration.routes.js';
import captionsRoutes from './features/captions/captions.routes.js';
import cardRoutes from "./features/card/card.routes.js";
import ttsRoutes from './features/tts/tts.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { NotFoundError } from './utils/custom-errors.js';

const app = express();

// Global Middlewares
// Configure Helmet to allow Swagger UI resources
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        imgSrc: ["'self'", "data:"],
      },
    },
  })
);
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/storage', express.static('storage'));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/youtube', youtubeRoutes);
app.use('/api/v1/video', videoRoutes);
app.use('/api/v1/narration', narrationRoutes);
app.use('/api/v1/captions', captionsRoutes);
app.use('/api/v1/card', cardRoutes);
app.use('/api/v1/tts', ttsRoutes);

// Catch-all for undefined routes
app.use('*', (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} does not exist`));
});

// Global Error Handler (must be registered last)
app.use(errorHandler);

export default app;
