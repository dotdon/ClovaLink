import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import prisma from '@/lib/prisma';
import { validateFile } from '@/lib/fileValidation';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, Permission.CREATE_DOCUMENTS)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folderId = formData.get('folderId') as string | null;
    const companyId = formData.get('companyId') as string | null;

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // For admin users, use the provided companyId
    // For other users, use their own companyId
    const targetCompanyId = session.user.role === 'ADMIN' ? companyId : session.user.companyId;

    if (!targetCompanyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Verify the company exists
    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // If folderId is provided, verify it exists and belongs to the target company
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId }
      });

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }

      if (folder.companyId !== targetCompanyId) {
        return NextResponse.json({ error: 'Folder does not belong to the specified company' }, { status: 403 });
      }
    }

    // Ensure uploads directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const uploadedDocuments = [];

    // Process each file
    for (const file of files) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `File "${file.name}" validation failed: ${validation.error}` },
          { status: 400 }
        );
      }

      const timestamp = Date.now();
      const filename = `${timestamp}-${validation.sanitizedFilename}`;
      const filePath = join(UPLOAD_DIR, filename);

      // Save the file
      const bytes = await file.arrayBuffer();
      const buffer = new Uint8Array(bytes);
      
      try {
        await writeFile(filePath, buffer);
      } catch (error) {
        console.error('Error saving file:', error);
        return NextResponse.json(
          { error: 'Failed to save file' },
          { status: 500 }
        );
      }

      // Create document record
      const document = await prisma.document.create({
        data: {
          name: validation.sanitizedFilename,
          path: filename,
          mimeType: file.type,
          size: file.size,
          employeeId: session.user.id,
          companyId: targetCompanyId,
          folderId: folderId,
          metadata: {
            originalName: file.name,
            sanitizedName: validation.sanitizedFilename,
            uploadedAt: new Date().toISOString(),
            isDirectUpload: true
          }
        }
      });

      uploadedDocuments.push(document);

      // Create activity record
      await prisma.activity.create({
        data: {
          type: 'UPLOAD',
          description: `Uploaded file "${validation.sanitizedFilename}"${folderId ? ' to folder' : ''}`,
          employeeId: session.user.id,
          documentId: document.id,
          companyId: targetCompanyId,
          metadata: {
            size: file.size,
            mimeType: file.type,
            folderId: folderId
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      documents: uploadedDocuments
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 