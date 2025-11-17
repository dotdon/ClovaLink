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

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get suspicious logins count
    const suspiciousLogins = await prisma.loginActivity.count({
      where: {
        suspicious: true,
        loginAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get failed logins count
    const failedLogins = await prisma.loginActivity.count({
      where: {
        success: false,
        loginAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get total logins count
    const totalLogins = await prisma.loginActivity.count({
      where: {
        loginAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get unique IP addresses
    const uniqueIPs = await prisma.loginActivity.findMany({
      where: {
        loginAt: {
          gte: thirtyDaysAgo,
        },
        ipAddress: {
          not: null,
        },
      },
      select: {
        ipAddress: true,
      },
      distinct: ['ipAddress'],
    });

    return NextResponse.json({
      suspiciousLogins,
      failedLogins,
      totalLogins,
      uniqueIPs: uniqueIPs.length,
    });
  } catch (error) {
    console.error('Error fetching security stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

