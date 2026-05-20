import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Expense Tracker API',
      version: '1.0.0',
      description:
        'A secure, production-ready REST API for personal expense tracking with JWT authentication, analytics, and multi-category support.',
      contact: { name: 'API Support', email: 'support@example.com' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}${env.API_PREFIX}`, description: 'Local development' },
      { url: 'https://your-app.railway.app/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide a valid access token obtained from /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            details: { type: 'object', nullable: true },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 142 },
            totalPages: { type: 'integer', example: 8 },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
