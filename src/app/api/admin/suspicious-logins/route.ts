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

    // Only IT and SUPER_ADMIN can access security endpoints
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!employee || (employee.role !== 'SUPER_ADMIN' && employee.role !== 'IT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all suspicious logins, ordered by most recent
    const suspiciousLogins = await prisma.loginActivity.findMany({
      where: {
        suspicious: true,
      },
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
      take: 100, // Last 100 suspicious logins
    });

    return NextResponse.json({ suspiciousLogins });
  } catch (error) {
    console.error('Error fetching suspicious logins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

