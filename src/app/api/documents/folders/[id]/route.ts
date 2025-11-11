import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { sanitizeCompanyName } from '@/lib/utils';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

async function deleteDocumentsInFolder(folderId: string, companyId: string) {
  const documents = await prisma.document.findMany({
    where: { folderId, companyId }
  });

  for (const doc of documents) {
    try {
      // Delete physical file first
      const filePath = join(UPLOAD_DIR, doc.path);
      if (existsSync(filePath)) {
        await rm(filePath);
      }

      // Then delete from database
      await prisma.document.delete({
        where: { id: doc.id }
      });
    } catch (error) {
      console.error(`Failed to delete document ${doc.id}:`, error);
    }
  }
}

// Soft delete folder and all its contents recursively
async function softDeleteFolderRecursive(folderId: string, deletedById: string) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      children: true,
      documents: true
    }
  });

  if (!folder) return;

  // Soft delete all child folders recursively
  for (const child of folder.children) {
    await softDeleteFolderRecursive(child.id, deletedById);
  }

  // Soft delete all documents in this folder
  await prisma.document.updateMany({
    where: { folderId: folder.id },
    data: {
      deletedAt: new Date(),
      deletedById: deletedById
    }
  });

  // Soft delete the folder itself
  await prisma.folder.update({
    where: { id: folderId },
    data: {
      deletedAt: new Date(),
      deletedById: deletedById
    }
  });
}

async function recursivelyDeleteFolder(folderId: string, companyId: string) {
  const folder = await prisma.folder.findFirst({
    where: { id: folderId, companyId },
    include: {
      children: true,
      documents: true,
      company: true
    }
  });

  if (!folder) return;

  // First recursively delete all subfolders
  for (const child of folder.children) {
    await recursivelyDeleteFolder(child.id, companyId);
  }

  // Delete all documents in this folder
  await deleteDocumentsInFolder(folder.id, companyId);

  // Delete the physical folder if it exists
  try {
    // Get the company folder name
    const companyFolder = sanitizeCompanyName(folder.company.name);
    
    // Build the folder path using company name and folder ID
    const folderPath = join(UPLOAD_DIR, companyFolder, folder.id);
    console.log('Attempting to delete physical folder at:', folderPath);
    
    if (existsSync(folderPath)) {
      await rm(folderPath, { recursive: true, force: true });
      console.log('Successfully deleted physical folder at:', folderPath);
    } else {
      console.log('Physical folder not found at:', folderPath);
    }
  } catch (error) {
    console.error(`Failed to delete physical folder ${folder.id}:`, error);
  }

  // Finally delete the folder from database
  try {
    await prisma.folder.delete({
      where: { id: folder.id }
    });
  } catch (error) {
    console.error(`Failed to delete folder ${folder.id} from database:`, error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('Unauthorized: No session or email');
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to delete folders'
      }, { status: 401 });
    }
    console.log('Delete request received for folder:', folderId);

    // Get the employee with their company info
    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
      include: { company: true }
    });

    if (!employee?.company) {
      console.log('Employee or company not found:', { email: session.user.email });
      return NextResponse.json({ 
        success: false,
        error: 'Employee or company not found',
        message: 'Could not verify employee or company information'
      }, { status: 404 });
    }

    // Find the folder and verify ownership
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        ...(employee.role !== 'ADMIN' ? { companyId: employee.company.id } : {})
      },
      include: {
        parent: true,
        documents: true,
        children: true
      }
    });

    if (!folder) {
      return NextResponse.json({ 
        success: false,
        error: 'Folder not found',
        message: 'The specified folder could not be found or you do not have permission to delete it'
      }, { status: 404 });
    }

    // Soft delete the folder and its contents
    console.log('Starting soft delete of folder');
    await softDeleteFolderRecursive(folder.id, employee.id);
    console.log('Completed soft delete of folder');

    // Log the activity
    await prisma.activity.create({
      data: {
        type: 'DELETE_FOLDER',
        description: `Moved folder to trash: ${folder.name}`,
        employeeId: employee.id,
        companyId: employee.company.id,
      }
    });

    console.log('Successfully moved folder to trash');
    return NextResponse.json({ 
      success: true,
      message: `Successfully moved folder to trash: ${folder.name}`
    });
  } catch (error) {
    console.error('Error in DELETE handler:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
      include: { company: true }
    });

    if (!employee?.company) {
      return NextResponse.json({ error: 'Employee or company not found' }, { status: 404 });
    }

    // Find and verify folder ownership
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        ...(employee.role !== 'ADMIN' ? { companyId: employee.company.id } : {})
      }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Check if another folder with the same name exists at the same level
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name,
        companyId: employee.company.id,
        parentId: folder.parentId,
        NOT: {
          id: folderId
        }
      }
    });

    if (existingFolder) {
      return NextResponse.json(
        { error: 'A folder with this name already exists in this location' },
        { status: 400 }
      );
    }

    // Update folder name
    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: { name: name.trim() }
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        type: 'RENAME_FOLDER',
        description: `Renamed folder from "${folder.name}" to "${name.trim()}"`,
        employeeId: employee.id,
        companyId: employee.company.id
      }
    });

    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 