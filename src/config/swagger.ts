import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hmm API',
      version: '1.0.0',
      description: 'API documentation for Hmm - Video downloader (Reddit & YouTube), uploader, and narration generator',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/features/**/*.routes.ts', './src/features/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
