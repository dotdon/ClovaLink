import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canExportActivities } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    
    // If employeeId is provided, check if user has permission to export their activities
    if (employeeId) {
      const targetEmployee = await prisma.employee.findUnique({
        where: { id: employeeId }
      });

      if (!targetEmployee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      if (!canExportActivities(session, targetEmployee)) {
        return NextResponse.json({ error: 'Permission denied to export activities for this employee' }, { status: 403 });
      }
    }

    // Build the query based on filters
    const where: any = {};
    
    // Apply employee filter if provided
    if (employeeId) {
      where.employeeId = employeeId;
    } else if (session.user.role !== 'ADMIN') {
      // Non-admin users can only see activities from their company
      where.companyId = session.user.companyId;
      
      // For managers, exclude admin activities
      if (session.user.role === 'MANAGER') {
        where.employee = {
          role: { not: 'ADMIN' }
        };
      }
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            email: true,
            role: true
          }
        },
        document: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Transform data for CSV
    const csvRows = [
      ['Timestamp', 'Type', 'Description', 'Employee Name', 'Employee Email', 'Employee Role', 'Document Name', 'Metadata'].join(','),
      ...activities.map(activity => [
        new Date(activity.timestamp).toISOString(),
        activity.type,
        `"${activity.description.replace(/"/g, '""')}"`,
        activity.employee?.name || 'N/A',
        activity.employee?.email || 'N/A',
        activity.employee?.role || 'N/A',
        activity.document?.name || 'N/A',
        `"${JSON.stringify(activity.metadata || {}).replace(/"/g, '""')}"`
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    // Set headers for CSV download
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', 'attachment; filename=activities.csv');

    return new NextResponse(csvContent, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error exporting activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 