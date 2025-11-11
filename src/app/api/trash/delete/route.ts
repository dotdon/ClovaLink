import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';
import { hasPermission, Permission } from '@/lib/permissions';

// DELETE /api/trash/delete - Permanently delete a trashed item
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check PERMANENTLY_DELETE permission (only ADMIN and MANAGER)
    if (!hasPermission(session, Permission.PERMANENTLY_DELETE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only ADMIN and MANAGER can permanently delete items.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const itemType = searchParams.get('itemType'); // 'document' or 'folder'

    if (!itemId || !itemType) {
      return NextResponse.json(
        { error: 'Item ID and type are required' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (itemType === 'document') {
      // Get document info before deleting
      const document = await prisma.document.findUnique({
        where: { id: itemId },
        select: { path: true, deletedAt: true, companyId: true }
      });

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Company-bound check
      if (document.companyId !== employee.companyId) {
        return NextResponse.json(
          { error: 'Access denied. You can only delete items from your company.' },
          { status: 403 }
        );
      }

      // Ensure document is in trash
      if (!document.deletedAt) {
        return NextResponse.json(
          { error: 'Document is not in trash' },
          { status: 400 }
        );
      }

      // Delete the physical file
      try {
        const filePath = path.join(process.cwd(), 'public', document.path);
        await unlink(filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database
      await prisma.document.delete({
        where: { id: itemId }
      });

      return NextResponse.json({
        message: 'Document permanently deleted'
      });
    } else if (itemType === 'folder') {
      // Verify folder belongs to user's company and is in trash
      const folder = await prisma.folder.findUnique({
        where: { id: itemId },
        select: { companyId: true, deletedAt: true }
      });

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }

      // Company-bound check
      if (folder.companyId !== employee.companyId) {
        return NextResponse.json(
          { error: 'Access denied. You can only delete items from your company.' },
          { status: 403 }
        );
      }

      // Ensure folder is in trash
      if (!folder.deletedAt) {
        return NextResponse.json(
          { error: 'Folder is not in trash' },
          { status: 400 }
        );
      }

      // Delete folder and all its contents recursively
      await deleteFolderRecursive(itemId);

      return NextResponse.json({
        message: 'Folder permanently deleted'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid item type' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error permanently deleting item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to permanently delete a folder and all its contents recursively
async function deleteFolderRecursive(folderId: string) {
  // Get all documents in this folder
  const documents = await prisma.document.findMany({
    where: { folderId: folderId },
    select: { id: true, path: true }
  });

  // Delete document files and database records
  for (const doc of documents) {
    try {
      const filePath = path.join(process.cwd(), 'public', doc.path);
      await unlink(filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
    }
    await prisma.document.delete({ where: { id: doc.id } });
  }

  // Get all child folders
  const childFolders = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true }
  });

  // Recursively delete child folders
  for (const child of childFolders) {
    await deleteFolderRecursive(child.id);
  }

  // Delete the folder itself
  await prisma.folder.delete({
    where: { id: folderId }
  });
}

