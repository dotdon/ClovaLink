import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

export async function GET(request: Request) {
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

    // Parse pagination parameters from URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const documentId = searchParams.get('documentId');
    const folderId = searchParams.get('folderId');

    // Build where clause based on role and filters
    let where: any = session.user.role === 'ADMIN'
      ? {} // Admins can see all activities
      : { companyId: employee.companyId }; // Others only see their company's activities

    // Add document or folder filter if provided
    if (documentId) {
      where.documentId = documentId;
    } else if (folderId) {
      where.folderId = folderId;
    }

    // Fetch activities with pagination and total count
    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        take: limit,
        skip: skip,
        orderBy: {
          createdAt: 'desc',
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
          folder: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.activity.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ 
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 