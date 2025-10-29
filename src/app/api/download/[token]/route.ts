import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { join } from 'path';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
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
    select: { name: true }
  });

  if (!folder) return [];

  const currentPath = [...parentPath, folder.name];

  const documents = await prisma.document.findMany({
    where: { folderId, companyId }
  });

  const documentsWithPath = documents.map(doc => ({
    ...doc,
    folderPath: currentPath
  }));

  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId, companyId }
  });

  const subfolderDocuments = await Promise.all(
    subfolders.map(subfolder => 
      getAllDocumentsInFolder(subfolder.id, companyId, currentPath)
    )
  );

  return [...documentsWithPath, ...subfolderDocuments.flat()];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    // Find and validate download link
    const downloadLink = await prisma.downloadLink.findUnique({
      where: { token },
      include: {
        folder: true,
        document: true
      }
    });

    if (!downloadLink) {
      return NextResponse.json({ error: 'Download link not found' }, { status: 404 });
    }

    if (!downloadLink.isActive) {
      return NextResponse.json({ error: 'Download link is inactive' }, { status: 403 });
    }

    if (downloadLink.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Download link has expired' }, { status: 403 });
    }

    // Update download count
    await prisma.downloadLink.update({
      where: { id: downloadLink.id },
      data: { downloads: { increment: 1 } }
    });

    // Handle folder download
    if (downloadLink.folder) {
      const documents = await getAllDocumentsInFolder(downloadLink.folder.id, downloadLink.companyId);
      
      // Create zip file
      const zip = new JSZip();
      
      // Add files to zip
      for (const doc of documents) {
        const filePath = join(UPLOAD_DIR, doc.path);
        if (existsSync(filePath)) {
          const zipPath = join(...doc.folderPath, doc.name);
          const fileContent = await readFile(filePath);
          zip.file(zipPath, new Uint8Array(fileContent));
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

      // Create response with zip file
      const response = new NextResponse(zipBuffer);
      response.headers.set('Content-Type', 'application/zip');
      response.headers.set('Content-Disposition', `attachment; filename="${downloadLink.folder.name}.zip"`);
      return response;
    }

    // Handle single document download
    if (downloadLink.document) {
      const filePath = join(UPLOAD_DIR, downloadLink.document.path);
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const fileContent = await readFile(filePath);
      const response = new NextResponse(fileContent);
      response.headers.set('Content-Type', downloadLink.document.mimeType);
      response.headers.set('Content-Disposition', `attachment; filename="${downloadLink.document.name}"`);
      return response;
    }

    return NextResponse.json({ error: 'Invalid download link' }, { status: 400 });

  } catch (error) {
    console.error('Error processing download:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 