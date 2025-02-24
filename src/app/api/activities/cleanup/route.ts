import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Only allow requests with the correct secret header
    const authHeader = request.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete activities older than 30 days
    const result = await prisma.activity.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo
        }
      }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} old activities`
    });
  } catch (error) {
    console.error('Error cleaning up activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 