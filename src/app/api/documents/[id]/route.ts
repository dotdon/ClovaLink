import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unlink, readFile, readdir, rmdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Helper function to check if directory is empty and remove it if it is
async function removeEmptyDirectory(dirPath: string) {
  try {
    const files = await readdir(dirPath);
    if (files.length === 0) {
      await rmdir(dirPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking/removing directory:', error);
    return false;
  }
}

// GET: Download a document
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify user has access to this document
    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email }
    });

    if (!employee || (employee.role !== 'ADMIN' && employee.companyId !== document.companyId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return file path for streaming
    return NextResponse.json({ 
      path: join(UPLOAD_DIR, document.path),
      name: document.name,
      mimeType: document.mimeType
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Rename document or move to folder
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { name, folderId } = data;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify user has access
    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email }
    });

    if (!employee || (employee.role !== 'ADMIN' && employee.companyId !== document.companyId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle renaming
    if (name !== undefined) {
      // Check if a document with the same name exists in the same folder
      const existingDocument = await prisma.document.findFirst({
        where: {
          name,
          companyId: document.companyId,
          folderId: document.folderId,
          NOT: { id: document.id }
        }
      });

      if (existingDocument) {
        return NextResponse.json(
          { error: 'A document with this name already exists in this location' },
          { status: 400 }
        );
      }
    }

    // If folderId provided, verify folder exists and belongs to same company
    if (folderId !== undefined) {
      if (folderId !== null) {
        const folder = await prisma.folder.findUnique({
          where: { id: folderId }
        });

        if (!folder || folder.companyId !== document.companyId) {
          return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
        }
      }
    }

    // Update document
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (folderId !== undefined) updateData.folderId = folderId;

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: updateData
    });

    // Create activity log
    if (name !== undefined) {
      await prisma.activity.create({
        data: {
          type: 'RENAME',
          description: `Renamed document from "${document.name}" to "${name}"`,
          employeeId: employee.id,
          documentId: document.id,
          companyId: document.companyId,
        },
      });
    }

    if (folderId !== undefined) {
      await prisma.activity.create({
        data: {
          type: 'MOVE',
          description: `Moved document: ${document.name}${folderId ? ' to folder' : ' to root'}`,
          employeeId: employee.id,
          documentId: document.id,
          companyId: document.companyId,
        },
      });
    }

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete a document
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify user has access
    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email }
    });

    if (!employee || (employee.role !== 'ADMIN' && employee.companyId !== document.companyId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete - move to trash
    await prisma.document.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: employee.id
      }
    });

    // Create activity log for document deletion
    await prisma.activity.create({
      data: {
        type: 'DELETE',
        description: `Moved document to trash: ${document.name}`,
        employeeId: employee.id,
        companyId: document.companyId,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: `Successfully deleted document: ${document.name}`
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 