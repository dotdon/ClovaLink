import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const passkeys = await prisma.passkey.findMany({
      where: { employeeId: session.user.id },
      select: {
        id: true,
        deviceName: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ passkeys });
  } catch (error) {
    console.error('Error fetching passkeys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passkeys' },
      { status: 500 }
    );
  }
}

