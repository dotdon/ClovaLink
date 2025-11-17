import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only IT and SUPER_ADMIN can access security endpoints
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!employee || (employee.role !== 'SUPER_ADMIN' && employee.role !== 'IT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all login activities, ordered by most recent
    const activities = await prisma.loginActivity.findMany({
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        loginAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching login activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

