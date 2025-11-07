import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rename, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { sanitizeCompanyName } from '@/lib/utils';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Helper function to check if target folder is a child of source folder
async function checkIsChildFolder(sourceId: string, targetId: string, visited = new Set<string>()): Promise<boolean> {
  // Prevent infinite recursion
  if (visited.has(targetId)) return false;
  visited.add(targetId);

  const folder = await prisma.folder.findUnique({
    where: { id: targetId },
    select: { parentId: true }
  });

  if (!folder) return false;
  if (folder.parentId === sourceId) return true;
  if (folder.parentId) return checkIsChildFolder(sourceId, folder.parentId, visited);
  return false;
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

    const { parentId, targetCompanyId } = await request.json();

    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
      include: { 
        company: true,
        crossCompanyAccess: {
          include: {
            company: true
          }
        }
      }
    });

    if (!employee?.company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Build list of accessible company IDs
    const accessibleCompanyIds = [
      employee.company.id,
      ...employee.crossCompanyAccess.map(access => access.company.id)
    ];

    // Find source folder - check if user has access to source company
    const sourceFolder = await prisma.folder.findFirst({
      where: { id: folderId }
    });

    if (!sourceFolder) {
      return NextResponse.json({ error: 'Source folder not found' }, { status: 404 });
    }

    if (!accessibleCompanyIds.includes(sourceFolder.companyId)) {
      return NextResponse.json({ error: 'No access to source folder' }, { status: 403 });
    }

    // Determine target company
    const finalTargetCompanyId = targetCompanyId || sourceFolder.companyId;
    if (!accessibleCompanyIds.includes(finalTargetCompanyId)) {
      return NextResponse.json({ error: 'No access to target company' }, { status: 403 });
    }

    let targetFolder = null;
    // If moving to another folder, verify target folder exists and belongs to target company
    if (parentId) {
      targetFolder = await prisma.folder.findFirst({
        where: { 
          id: parentId,
          companyId: finalTargetCompanyId
        }
      });

      if (!targetFolder) {
        return NextResponse.json({ error: 'Target folder not found' }, { status: 404 });
      }

      // Prevent moving folder into itself
      if (folderId === parentId) {
        return NextResponse.json(
          { error: 'Cannot move a folder into itself' },
          { status: 400 }
        );
      }

      // Check for circular dependency with improved visited tracking (only if same company)
      if (sourceFolder.companyId === finalTargetCompanyId) {
        const isChildFolder = await checkIsChildFolder(folderId, parentId);
        if (isChildFolder) {
          return NextResponse.json(
            { error: 'Cannot move a folder into one of its subfolders' },
            { status: 400 }
          );
        }
      }
    }

    // Get company info for physical paths
    const sourceCompany = await prisma.company.findUnique({
      where: { id: sourceFolder.companyId }
    });
    const targetCompany = await prisma.company.findUnique({
      where: { id: finalTargetCompanyId }
    });

    if (!sourceCompany || !targetCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Build the old and new physical paths
    const sourceCompanyFolder = sanitizeCompanyName(sourceCompany.name);
    const targetCompanyFolder = sanitizeCompanyName(targetCompany.name);
    const sourceCompanyDir = join(UPLOAD_DIR, sourceCompanyFolder);
    const companyDir = join(UPLOAD_DIR, targetCompanyFolder);
    
    // Build old path using folder ID
    const oldPath = join(companyDir, sourceFolder.id);

    // Build new path using folder ID (it stays the same since we're not changing the folder's ID)
    const newPath = oldPath;

    // Move the physical folder if it exists
    if (existsSync(oldPath)) {
      // Ensure the parent directory exists
      const newParentDir = parentId 
        ? join(companyDir, parentId)
        : companyDir;
        
      if (!existsSync(newParentDir)) {
        await mkdir(newParentDir, { recursive: true });
      }
    }

    // Update the folder in the database (including companyId if cross-company move)
    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: { 
        parentId: parentId || null,
        companyId: finalTargetCompanyId
      }
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'MOVE_FOLDER',
        description: `Moved folder: ${sourceFolder.name}${parentId ? ' to another folder' : ' to root'}`,
        employeeId: employee.id,
        companyId: employee.company.id,
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedFolder,
      message: `Successfully moved folder: ${sourceFolder.name}`
    });
  } catch (error) {
    console.error('Error moving folder:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to move folder'
    }, { status: 500 });
  }
} 