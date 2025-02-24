import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { mkdir } from 'fs/promises';
import path from 'path';
import { sanitizeCompanyName } from '@/lib/utils';
import { hasPermission, Permission } from '@/lib/permissions';

const MAX_FOLDER_NAME_LENGTH = 255;
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Helper function to validate folder name
function validateFolderName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Folder name is required' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { isValid: false, error: 'Folder name cannot be empty' };
  }

  if (trimmedName.length > MAX_FOLDER_NAME_LENGTH) {
    return { isValid: false, error: `Folder name cannot exceed ${MAX_FOLDER_NAME_LENGTH} characters` };
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
  if (invalidChars.test(trimmedName)) {
    return { isValid: false, error: 'Folder name contains invalid characters' };
  }

  return { isValid: true };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to create folders'
      }, { status: 401 });
    }

    if (!hasPermission(session, Permission.CREATE_DOCUMENTS)) {
      return NextResponse.json({ 
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to create folders'
      }, { status: 403 });
    }

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request',
        message: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    const { name, parentId, companyId } = body || {};
    
    // Validate folder name
    const nameValidation = validateFolderName(name);
    if (!nameValidation.isValid) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid folder name',
        message: nameValidation.error 
      }, { status: 400 });
    }

    // For admin users, use the provided companyId
    // For other users, use their own companyId
    const targetCompanyId = session.user.role === 'ADMIN' ? companyId : session.user.companyId;

    if (!targetCompanyId) {
      return NextResponse.json({ 
        success: false,
        error: 'Company ID required',
        message: 'Company ID is required'
      }, { status: 400 });
    }

    // Verify the company exists
    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId }
    });

    if (!company) {
      return NextResponse.json({ 
        success: false,
        error: 'Company not found',
        message: 'The specified company does not exist'
      }, { status: 404 });
    }

    // If parentId is provided, verify it exists and belongs to the same company
    if (parentId) {
      const parentFolder = await prisma.folder.findUnique({
        where: { id: parentId }
      });

      if (!parentFolder) {
        return NextResponse.json({ 
          success: false,
          error: 'Parent folder not found',
          message: 'The specified parent folder does not exist'
        }, { status: 404 });
      }

      if (parentFolder.companyId !== targetCompanyId) {
        return NextResponse.json({ 
          success: false,
          error: 'Permission denied',
          message: 'The parent folder does not belong to the specified company'
        }, { status: 403 });
      }
    }

    // Check if a folder with the same name exists at the same level
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: name.trim(),
        companyId: targetCompanyId,
        parentId: parentId || null
      }
    });

    if (existingFolder) {
      return NextResponse.json({ 
        success: false,
        error: 'Duplicate folder name',
        message: 'A folder with this name already exists in this location'
      }, { status: 400 });
    }

    // Create folder in database
    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        companyId: targetCompanyId,
        parentId,
        createdById: session.user.id
      }
    });

    try {
      // Create physical folder
      const companyFolder = sanitizeCompanyName(company.name);
      const folderPath = path.join(UPLOAD_DIR, companyFolder, folder.id);
      await mkdir(folderPath, { recursive: true });
    } catch (fsError) {
      console.error('Error creating physical folder:', fsError);
      // Delete the database record if physical folder creation fails
      await prisma.folder.delete({ where: { id: folder.id } });
      throw new Error('Failed to create physical folder');
    }

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'CREATE',
        description: `Created folder: ${name.trim()}${parentId ? ' (nested)' : ''}`,
        employeeId: session.user.id,
        companyId: targetCompanyId
      }
    });

    return NextResponse.json({
      success: true,
      data: folder,
      message: `Successfully created folder: ${name.trim()}`
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to create folder'
    }, { status: 500 });
  }
} 