import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get users active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const activeUsers = await prisma.employee.findMany({
      where: {
        isActive: true,
        lastActivityAt: {
          gte: fiveMinutesAgo,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        lastActivityAt: true,
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    return NextResponse.json({ activeUsers });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

