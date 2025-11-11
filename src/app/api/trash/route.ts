import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

// GET /api/trash - Get all trashed items for the current company
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check VIEW_TRASH permission
    if (!hasPermission(session, Permission.VIEW_TRASH)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get trashed documents
    const trashedDocuments = await prisma.document.findMany({
      where: {
        companyId: employee.companyId,
        deletedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        size: true,
        mimeType: true,
        deletedAt: true,
        deletedBy: {
          select: {
            name: true
          }
        },
        folder: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        deletedAt: 'desc'
      }
    });

    // Get trashed folders
    const trashedFolders = await prisma.folder.findMany({
      where: {
        companyId: employee.companyId,
        deletedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        deletedAt: true,
        deletedBy: {
          select: {
            name: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            documents: true,
            children: true
          }
        }
      },
      orderBy: {
        deletedAt: 'desc'
      }
    });

    return NextResponse.json({
      documents: trashedDocuments,
      folders: trashedFolders
    });
  } catch (error) {
    console.error('Error fetching trash:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

