import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Configure Prisma with connection pooling and better error handling
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Handle cleanup on application shutdown (only in Node.js runtime, not Edge)
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
  
  // Handle connection errors gracefully
  process.on('unhandledRejection', (reason, promise) => {
    if (reason instanceof Error && reason.message.includes('Prisma')) {
      console.error('Prisma connection error:', reason);
    }
  });
}

export default prisma; 