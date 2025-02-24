import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Build the where clause based on user role
    const where = employee.role === 'ADMIN' 
      ? {} // Admins can see all activities
      : { companyId: employee.companyId }; // Regular users only see their company's activities

    // Get the last 10 activities
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
    console.error('Error fetching activity summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 