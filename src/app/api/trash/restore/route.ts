import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

// POST /api/trash/restore - Restore a trashed item
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RESTORE_TRASH permission
    if (!hasPermission(session, Permission.RESTORE_TRASH)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { itemId, itemType } = body; // itemType: 'document' or 'folder'

    if (!itemId || !itemType) {
      return NextResponse.json(
        { error: 'Item ID and type are required' },
        { status: 400 }
      );
    }

    // Get employee info to verify company access
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (itemType === 'document') {
      // Verify document belongs to user's company
      const document = await prisma.document.findUnique({
        where: { id: itemId },
        select: { companyId: true, employeeId: true }
      });

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // Company-bound check: only access items from your company
      if (document.companyId !== employee.companyId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Users can only restore their own documents, ADMIN/MANAGER can restore any
      if (employee.role === 'USER' && document.employeeId !== employee.id) {
        return NextResponse.json({ error: 'You can only restore your own documents' }, { status: 403 });
      }

      // Restore document
      await prisma.document.update({
        where: { id: itemId },
        data: {
          deletedAt: null,
          deletedById: null
        }
      });

      return NextResponse.json({
        message: 'Document restored successfully'
      });
    } else if (itemType === 'folder') {
      // Verify folder belongs to user's company
      const folder = await prisma.folder.findUnique({
        where: { id: itemId },
        select: { companyId: true, createdById: true }
      });

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }

      // Company-bound check
      if (folder.companyId !== employee.companyId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Users can only restore their own folders, ADMIN/MANAGER can restore any
      if (employee.role === 'USER' && folder.createdById !== employee.id) {
        return NextResponse.json({ error: 'You can only restore your own folders' }, { status: 403 });
      }

      // Restore folder and all its contents recursively
      await restoreFolderRecursive(itemId);

      return NextResponse.json({
        message: 'Folder restored successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid item type' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error restoring item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to restore a folder and all its contents recursively
async function restoreFolderRecursive(folderId: string) {
  // Restore the folder itself
  await prisma.folder.update({
    where: { id: folderId },
    data: {
      deletedAt: null,
      deletedById: null
    }
  });

  // Restore all documents in this folder
  await prisma.document.updateMany({
    where: { folderId: folderId },
    data: {
      deletedAt: null,
      deletedById: null
    }
  });

  // Get all child folders
  const childFolders = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true }
  });

  // Recursively restore child folders
  for (const child of childFolders) {
    await restoreFolderRecursive(child.id);
  }
}

