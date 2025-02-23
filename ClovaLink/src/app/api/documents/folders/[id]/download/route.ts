import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import JSZip from 'jszip';
import { Document } from '@prisma/client';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

interface DocumentWithPath extends Document {
  folderPath: string[];
}

// Helper function to recursively get all documents in a folder and its subfolders
async function getAllDocumentsInFolder(
  folderId: string, 
  companyId: string, 
  parentPath: string[] = []
): Promise<DocumentWithPath[]> {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      documents: true,
      children: true
    }
  });

  if (!folder) return [];

  const currentPath = [...parentPath, folder.name];

  // Add current folder's documents with path
  const documentsWithPath = folder.documents.map(doc => ({
    ...doc,
    folderPath: currentPath
  }));

  // Recursively get documents from subfolders
  const subfolderDocuments = await Promise.all(
    folder.children.map(subfolder => 
      getAllDocumentsInFolder(subfolder.id, companyId, currentPath)
    )
  );

  return [...documentsWithPath, ...subfolderDocuments.flat()];
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
      include: { company: true }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get folder and verify ownership
    const folder = await prisma.folder.findUnique({
      where: { id: params.id }
    });

    if (!folder || folder.companyId !== employee.companyId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Get all documents in folder and subfolders with their paths
    const documents = await getAllDocumentsInFolder(folder.id, employee.companyId);

    // Create zip file
    const zip = new JSZip();
    
    // Add files to zip
    for (const doc of documents) {
      const filePath = join(UPLOAD_DIR, doc.path);
      if (existsSync(filePath)) {
        // Create full path in zip including folder structure
        const zipPath = join(...doc.folderPath, doc.name);
        const fileContent = readFileSync(filePath);
        zip.file(zipPath.replace(/\\/g, '/'), new Uint8Array(fileContent));
      }
    }

    // Generate zip buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'DOWNLOAD',
        description: `Downloaded folder: ${folder.name} as zip`,
        employeeId: employee.id,
        companyId: employee.companyId,
        metadata: {
          folderId: folder.id,
          documentCount: documents.length
        }
      }
    });

    // Create response with zip file
    const response = new NextResponse(zipBuffer);
    response.headers.set('Content-Type', 'application/zip');
    response.headers.set('Content-Disposition', `attachment; filename="${folder.name}.zip"`);
    return response;

  } catch (error) {
    console.error('Error downloading folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 