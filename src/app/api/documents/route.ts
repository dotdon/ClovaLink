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
    const companyId = url.searchParams.get('companyId');

    // Build where clause based on user role and company
    const where = session.user.role === 'ADMIN'
      ? {} // Admins can see all documents
      : { companyId: session.user.companyId }; // Others can only see their company's documents

    // Fetch folders with their documents
    const folders = await prisma.folder.findMany({
      where,
      include: {
        documents: true,
        children: {
          include: {
            documents: true,
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

    // Add isFavorite and isPinned flags
    const foldersWithFlags = folders.map(folder => ({
      ...folder,
      isFavorite: folder.favorites.length > 0,
      isPinned: folder.pinnedBy.length > 0,
      pinnedOrder: folder.pinnedBy[0]?.order
    }));

    const documentsWithFlags = unorganizedDocuments.map(doc => ({
      ...doc,
      isFavorite: doc.favorites.length > 0
    }));

    return NextResponse.json({
      folders: foldersWithFlags,
      unorganizedDocuments: documentsWithFlags,
    });
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