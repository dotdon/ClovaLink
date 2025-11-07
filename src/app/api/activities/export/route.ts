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
    const documentId = searchParams.get('documentId');
    const folderId = searchParams.get('folderId');
    
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

    // Build the query based on filters
    let where: any = session.user.role === 'ADMIN'
      ? {} // Admins can see all activities
      : { companyId: employee.companyId }; // Others only see their company's activities
    
    // Apply employee filter if provided
    if (employeeId) {
      where.employeeId = employeeId;
    }
    
    // Add document or folder filter if provided
    if (documentId) {
      where.documentId = documentId;
    } else if (folderId) {
      where.folderId = folderId;
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
        },
        folder: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data for CSV
    const csvRows = [
      ['Timestamp', 'Type', 'Description', 'Employee Name', 'Employee Email', 'Employee Role', 'Document/Folder Name', 'IP Address', 'User Agent'].join(','),
      ...activities.map(activity => [
        new Date(activity.createdAt).toLocaleString(),
        activity.type,
        `"${activity.description.replace(/"/g, '""')}"`,
        activity.employee?.name || 'N/A',
        activity.employee?.email || 'N/A',
        activity.employee?.role || 'N/A',
        activity.document?.name || activity.folder?.name || 'N/A',
        activity.ipAddress || 'N/A',
        `"${(activity.userAgent || 'N/A').replace(/"/g, '""')}"`
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