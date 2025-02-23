import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view activities
    if (!hasPermission(session, Permission.VIEW_ACTIVITIES)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get the employee with their company info
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        companyId: true,
        role: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Build where clause based on role
    const where = session.user.role === 'ADMIN'
      ? {} // Admins can see all activities
      : { companyId: employee.companyId }; // Others only see their company's activities

    const activities = await prisma.activity.findMany({
      where,
      take: 10,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
        document: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 