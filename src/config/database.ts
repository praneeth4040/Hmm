import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Ensures Prisma Client reconnects automatically if Neon DB closes idle pool sockets.
 */
export const ensureDbConnection = async (): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.warn('⚠️ Database connection lost/closed. Reconnecting to Neon DB...');
    await prisma.$connect();
  }
};

