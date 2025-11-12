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

    // Get items from request body (supports both single and bulk delete)
    const body = await request.json().catch(() => ({}));
    const items = body.items || [];
    
    // Support legacy query params for single item
    if (items.length === 0) {
      const { searchParams } = new URL(request.url);
      const itemId = searchParams.get('itemId');
      const itemType = searchParams.get('itemType');
      if (itemId && itemType) {
        items.push({ id: itemId, type: itemType });
      }
    }

    if (items.length === 0) {
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

    const results = [];
    const errors = [];

    // Process each item
    for (const item of items) {
      const { id: itemId, type: itemType } = item;

      if (!itemId || !itemType) {
        errors.push({ itemId, error: 'Item ID and type are required' });
        continue;
      }

      try {
        if (itemType === 'document') {
          // Get document info before deleting
          const document = await prisma.document.findUnique({
            where: { id: itemId },
            select: { path: true, deletedAt: true, companyId: true }
          });

          if (!document) {
            errors.push({ itemId, error: 'Document not found' });
            continue;
          }

          // Company-bound check
          if (document.companyId !== employee.companyId) {
            errors.push({ itemId, error: 'Access denied. You can only delete items from your company.' });
            continue;
          }

          // Ensure document is in trash
          if (!document.deletedAt) {
            errors.push({ itemId, error: 'Document is not in trash' });
            continue;
          }

          // Delete the physical file
          try {
            const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
            const filePath = path.join(process.cwd(), UPLOAD_DIR, document.path);
            await unlink(filePath);
          } catch (fileError) {
            console.error('Error deleting file:', fileError);
            // Continue with database deletion even if file deletion fails
          }

          // Delete from database
          await prisma.document.delete({
            where: { id: itemId }
          });

          results.push({ itemId, type: 'document', success: true });
        } else if (itemType === 'folder') {
          // Verify folder belongs to user's company and is in trash
          const folder = await prisma.folder.findUnique({
            where: { id: itemId },
            select: { companyId: true, deletedAt: true }
          });

          if (!folder) {
            errors.push({ itemId, error: 'Folder not found' });
            continue;
          }

          // Company-bound check
          if (folder.companyId !== employee.companyId) {
            errors.push({ itemId, error: 'Access denied. You can only delete items from your company.' });
            continue;
          }

          // Ensure folder is in trash
          if (!folder.deletedAt) {
            errors.push({ itemId, error: 'Folder is not in trash' });
            continue;
          }

          // Delete folder and all its contents recursively
          await deleteFolderRecursive(itemId);

          results.push({ itemId, type: 'folder', success: true });
        } else {
          errors.push({ itemId, error: 'Invalid item type' });
        }
      } catch (error) {
        console.error(`Error deleting item ${itemId}:`, error);
        errors.push({ itemId, error: error instanceof Error ? error.message : 'Failed to delete item' });
      }
    }

    // Return results
    if (errors.length > 0 && results.length === 0) {
      // All failed
      return NextResponse.json(
        { error: errors[0].error, errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: results.length === 1 
        ? `${results[0].type === 'document' ? 'Document' : 'Folder'} permanently deleted`
        : `${results.length} items permanently deleted`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
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
  const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
  for (const doc of documents) {
    try {
      const filePath = path.join(process.cwd(), UPLOAD_DIR, doc.path);
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

