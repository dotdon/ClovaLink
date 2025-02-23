import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rename, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Wait for session and params concurrently
    const [session, params] = await Promise.all([
      getServerSession(authOptions),
      Promise.resolve(context.params)
    ]);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    let targetFolder: string | undefined;
    try {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return NextResponse.json({ 
          error: 'Invalid content type. Expected application/json' 
        }, { status: 400 });
      }

      const body = await request.json();
      targetFolder = body.targetFolder;
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 });
    }

    // Get the employee and their company
    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
      include: { company: true }
    });

    if (!employee?.company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get the document to move
    const document = await prisma.document.findUnique({
      where: {
        id: params.id,
        companyId: employee.company.id,
      }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // If moving to root directory
    if (!targetFolder) {
      const fileName = document.name;
      const oldPath = document.path.startsWith(UPLOAD_DIR) 
        ? document.path 
        : join(UPLOAD_DIR, document.path);
      const newPath = join(UPLOAD_DIR, fileName);

      try {
        // Move the file if it exists
        if (existsSync(oldPath) && oldPath !== newPath) {
          await rename(oldPath, newPath);
        }
      } catch (error) {
        console.error('Error moving file:', error);
      }

      // Update the document in database
      const updatedDocument = await prisma.document.update({
        where: {
          id: params.id,
        },
        data: {
          folderId: null,
          path: fileName,
        },
      });

      // Get the updated document tree
      const folders = await prisma.folder.findMany({
        where: {
          companyId: employee.company.id,
        },
        include: {
          documents: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Get unorganized documents
      const unorganizedDocuments = await prisma.document.findMany({
        where: {
          companyId: employee.company.id,
          folderId: null,
        },
      });

      // Format the response
      const documentTree = [
        ...folders.map(folder => ({
          folder: folder.name,
          documents: folder.documents,
          count: folder.documents.length
        })),
        {
          folder: '',
          documents: unorganizedDocuments,
          count: unorganizedDocuments.length
        }
      ];

      return NextResponse.json({ 
        success: true,
        document: updatedDocument,
        documentTree
      });
    }

    // Find the target folder
    const targetFolderRecord = await prisma.folder.findFirst({
      where: {
        name: targetFolder,
        companyId: employee.company.id,
      },
    });

    if (!targetFolderRecord) {
      return NextResponse.json({ error: 'Target folder not found' }, { status: 404 });
    }

    // Create target directory if it doesn't exist
    const sanitizedFolderName = targetFolder.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
    const targetDir = join(UPLOAD_DIR, sanitizedFolderName);
    
    try {
      if (!existsSync(targetDir)) {
        await mkdir(targetDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating target directory:', error);
    }

    // Move the file
    const fileName = document.name;
    const oldPath = document.path.startsWith(UPLOAD_DIR) 
      ? document.path 
      : join(UPLOAD_DIR, document.path);
    const newPath = join(targetDir, fileName);

    try {
      if (existsSync(oldPath) && oldPath !== newPath) {
        await rename(oldPath, newPath);
      }
    } catch (error) {
      console.error('Error moving file:', error);
    }

    // Update the document in database
    const updatedDocument = await prisma.document.update({
      where: {
        id: params.id,
      },
      data: {
        folderId: targetFolderRecord?.id || null,
        path: targetFolderRecord ? join(sanitizedFolderName, fileName) : fileName,
      },
    });

    // Get the updated document tree
    const folders = await prisma.folder.findMany({
      where: {
        companyId: employee.company.id,
      },
      include: {
        documents: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get unorganized documents
    const unorganizedDocuments = await prisma.document.findMany({
      where: {
        companyId: employee.company.id,
        folderId: null,
      },
    });

    // Format the response
    const documentTree = [
      ...folders.map(folder => ({
        folder: folder.name,
        documents: folder.documents,
        count: folder.documents.length
      })),
      {
        folder: '',
        documents: unorganizedDocuments,
        count: unorganizedDocuments.length
      }
    ];

    // Create an activity log
    await prisma.activity.create({
      data: {
        type: 'MOVE',
        description: `Document moved to folder: ${targetFolder || 'root'}`,
        employeeId: employee.id,
        documentId: params.id,
        companyId: employee.company.id,
      },
    });

    return NextResponse.json({ 
      success: true,
      document: updatedDocument,
      documentTree
    });
  } catch (error) {
    console.error('Error moving document:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 