import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { hasPermission, Permission, canAccessCompany } from '@/lib/permissions';

// GET: Fetch all documents and folders
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view documents
    if (!hasPermission(session, Permission.VIEW_DOCUMENTS)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const url = new URL(request.url);
    const requestedCompanyId = url.searchParams.get('companyId');

    // Fetch the employee to check cross-company access
    const employee = await prisma.employee.findFirst({
      where: { id: session.user.id },
      include: {
        crossCompanyAccess: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Determine which company to filter by
    let targetCompanyId = session.user.companyId;
    
    if (requestedCompanyId) {
      // Check if user has access to the requested company
      const hasAccess = 
        requestedCompanyId === session.user.companyId || // Primary company
        employee.crossCompanyAccess.some(access => access.companyId === requestedCompanyId) || // Cross-company access
        session.user.role === 'ADMIN'; // Admins have access to all

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to this company' }, { status: 403 });
      }

      targetCompanyId = requestedCompanyId;
    }

    // Build where clause based on target company - exclude deleted items
    const where = { 
      companyId: targetCompanyId,
      deletedAt: null  // Exclude soft-deleted folders
    };

    // Fetch folders with their documents - recursively include all levels
    const folders = await prisma.folder.findMany({
      where,
      include: {
        documents: {
          where: { deletedAt: null }  // Exclude soft-deleted documents
        },
        children: {
          where: { deletedAt: null },
          include: {
            documents: {
              where: { deletedAt: null }
            },
            children: {
              where: { deletedAt: null },
              include: {
                documents: {
                  where: { deletedAt: null }
                },
                favorites: {
                  where: { employeeId: session.user.id },
                  select: { id: true }
                },
                pinnedBy: {
                  where: { employeeId: session.user.id },
                  select: { id: true, order: true }
                }
              }
            },
            favorites: {
              where: { employeeId: session.user.id },
              select: { id: true }
            },
            pinnedBy: {
              where: { employeeId: session.user.id },
              select: { id: true, order: true }
            }
          },
        },
        favorites: {
          where: { employeeId: session.user.id },
          select: { id: true }
        },
        pinnedBy: {
          where: { employeeId: session.user.id },
          select: { id: true, order: true }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Fetch unorganized documents (documents not in any folder)
    const unorganizedDocuments = await prisma.document.findMany({
      where: {
        ...where,
        folderId: null,
      },
      include: {
        favorites: {
          where: { employeeId: session.user.id },
          select: { id: true }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Recursively add isFavorite and isPinned flags to all nested folders
    const addFlagsToFolder = (folder: any): any => ({
      ...folder,
      isFavorite: folder.favorites?.length > 0 || false,
      isPinned: folder.pinnedBy?.length > 0 || false,
      pinnedOrder: folder.pinnedBy?.[0]?.order,
      hasPassword: !!folder.password, // Add flag indicating if folder is password protected
      password: undefined, // Don't send the actual password hash to frontend
      children: folder.children?.map(addFlagsToFolder) || [],
      documents: folder.documents || []
    });

    const foldersWithFlags = folders.map(addFlagsToFolder);

    const documentsWithFlags = unorganizedDocuments.map(doc => ({
      ...doc,
      isFavorite: doc.favorites.length > 0
    }));

    const response = NextResponse.json({
      folders: foldersWithFlags,
      unorganizedDocuments: documentsWithFlags,
    });
    // Cache documents for 15 seconds to reduce database load
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
    return response;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new folder
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, Permission.CREATE_DOCUMENTS)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const data = await request.json();

    // Ensure user can only create documents in their company
    if (!canAccessCompany(session, data.companyId)) {
      return NextResponse.json({ error: 'Invalid company' }, { status: 403 });
    }

    const document = await prisma.document.create({
      data: {
        ...data,
        employeeId: session.user.id,
      },
      include: {
        uploadedBy: {
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
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 