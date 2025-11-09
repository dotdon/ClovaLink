import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, targetCompanyId } = await request.json();

    if (!documentId || !targetCompanyId) {
      return NextResponse.json(
        { error: 'Document ID and target company ID are required' },
        { status: 400 }
      );
    }

    // Get the source document
    const sourceDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        company: true,
      },
    });

    if (!sourceDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify user has access to the target company
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      include: {
        crossCompanyAccess: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if user has access to target company
    const hasAccess =
      session.user.role === 'ADMIN' ||
      employee.companyId === targetCompanyId ||
      employee.crossCompanyAccess.some((access) => access.companyId === targetCompanyId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this company' },
        { status: 403 }
      );
    }

    // Check if document already exists in target company
    const existingDocument = await prisma.document.findFirst({
      where: {
        companyId: targetCompanyId,
        filename: sourceDocument.filename,
      },
    });

    if (existingDocument) {
      return NextResponse.json(
        { error: 'A document with this filename already exists in the target company' },
        { status: 409 }
      );
    }

    // Copy the file physically
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const sourceFilePath = path.join(uploadsDir, sourceDocument.filename);
    
    try {
      await fs.access(sourceFilePath);
    } catch (error) {
      return NextResponse.json(
        { error: 'Source file not found on server' },
        { status: 404 }
      );
    }

    // Create a new filename to avoid conflicts
    const ext = path.extname(sourceDocument.filename);
    const baseName = path.basename(sourceDocument.filename, ext);
    const timestamp = Date.now();
    const newFilename = `${baseName}-${timestamp}${ext}`;
    const targetFilePath = path.join(uploadsDir, newFilename);

    // Copy the file
    await fs.copyFile(sourceFilePath, targetFilePath);

    // Create the new document record
    const newDocument = await prisma.document.create({
      data: {
        name: sourceDocument.name,
        filename: newFilename,
        mimeType: sourceDocument.mimeType,
        size: sourceDocument.size,
        companyId: targetCompanyId,
        uploadedById: session.user.id,
        folderId: null, // Place in root/unorganized
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'DOCUMENT_UPLOAD',
        description: `Saved document "${sourceDocument.name}" from message`,
        employeeId: session.user.id,
        companyId: targetCompanyId,
      },
    });

    return NextResponse.json({
      success: true,
      document: newDocument,
    });
  } catch (error) {
    console.error('Error saving document from message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

