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

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: {
        totpEnabled: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      enabled: employee.totpEnabled,
    });
  } catch (error) {
    console.error('Error fetching TOTP status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch 2FA status' },
      { status: 500 }
    );
  }
}

