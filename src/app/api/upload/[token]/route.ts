import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import prisma from '@/lib/prisma';
import { validateFile } from '@/lib/fileValidation';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // Wait for params to be available
    const resolvedParams = await Promise.resolve(params);
    const token = resolvedParams.token;

    // Get the upload link
    const uploadLink = await prisma.uploadLink.findUnique({
      where: { token },
      include: {
        employee: {
          select: {
            id: true,
            companyId: true
          }
        }
      }
    });

    if (!uploadLink) {
      return NextResponse.json({ success: false, error: 'Invalid upload link' }, { status: 404 });
    }

    // Check if the upload link has expired
    if (uploadLink.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Upload link has expired' }, { status: 400 });
    }

    // Check if the upload link has reached its maximum uses
    const currentUseCount = uploadLink.useCount || 0;
    if (uploadLink.maxUses && currentUseCount >= uploadLink.maxUses) {
      return NextResponse.json({ 
        success: false, 
        error: `Upload link has reached maximum uses (${uploadLink.maxUses})` 
      }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    const uploaderName = formData.get('uploaderName') as string;

    if (!files.length || !uploaderName) {
      return NextResponse.json({ error: 'Files and uploader name are required' }, { status: 400 });
    }

    // Ensure uploads directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const timestamp = Date.now();
    const defaultFolder = 'uncategorized';
    const metadata = uploadLink.metadata as { folderName?: string; folderId?: string };
    const folderName = metadata?.folderName || defaultFolder;
    const sanitizedFolderName = folderName.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
    const folderPath = join(UPLOAD_DIR, sanitizedFolderName);
    
    // Ensure the folder exists
    try {
      await mkdir(folderPath, { recursive: true });
    } catch (error) {
      console.error('Error creating folder:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create upload folder' },
        { status: 500 }
      );
    }

    // Check if we already have a folder ID in the upload link metadata
    let folder;
    try {
      if (metadata?.folderId) {
        folder = await prisma.folder.findFirst({
          where: {
            id: metadata.folderId,
            companyId: uploadLink.employee.companyId
          }
        });
        
        if (folder) {
          console.log('Reusing existing folder:', folder.name);
        }
      }

      if (!folder) {
        // Look for a folder with the same name
        folder = await prisma.folder.findFirst({
          where: {
            name: metadata.folderName || defaultFolder,
            companyId: uploadLink.employee.companyId
          }
        });

        if (!folder) {
          // Create new folder only if none exists
          folder = await prisma.folder.create({
            data: {
              name: metadata.folderName || defaultFolder,
              companyId: uploadLink.employee.companyId,
              createdById: uploadLink.employee.id
            }
          });

          // Store the folder ID in the upload link metadata
          const updatedMetadata = {
            folderName: metadata.folderName || defaultFolder,
            folderId: folder.id
          };

          await prisma.uploadLink.update({
            where: { id: uploadLink.id },
            data: {
              metadata: updatedMetadata
            }
          });

          // Log folder creation
          await prisma.activity.create({
            data: {
              type: 'CREATE_FOLDER',
              description: `Created folder for upload link: ${metadata.folderName || defaultFolder}`,
              employeeId: uploadLink.employee.id,
              companyId: uploadLink.employee.companyId,
              metadata: {
                uploadLinkId: uploadLink.id
              }
            }
          });

          console.log('Created new folder:', folder.name);
        } else {
          console.log('Found existing folder with same name:', folder.name);
          
          // Store the folder ID in the upload link metadata
          const updatedMetadata = {
            folderName: metadata.folderName || defaultFolder,
            folderId: folder.id
          };

          await prisma.uploadLink.update({
            where: { id: uploadLink.id },
            data: {
              metadata: updatedMetadata
            }
          });
        }
      }
    } catch (error) {
      console.error('Error handling folder:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to handle folder in database' },
        { status: 500 }
      );
    }

    const uploadedDocuments = [];

    // Process each file
    for (const file of files) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: `File "${file.name}" validation failed: ${validation.error}` },
          { status: 400 }
        );
      }

      // Use sanitized filename
      const filename = validation.sanitizedFilename;
      const filePath = join(folderPath, filename);

      // Save the file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      try {
        await writeFile(filePath, buffer);
      } catch (error) {
        console.error('Error saving file:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to save file' },
          { status: 500 }
        );
      }

      // Create document record
      const document = await prisma.document.create({
        data: {
          name: validation.sanitizedFilename,
          path: join(sanitizedFolderName, filename),
          mimeType: file.type,
          size: file.size,
          employeeId: uploadLink.employee.id,
          companyId: uploadLink.employee.companyId,
          folderId: folder.id,
          metadata: {
            uploaderName: uploaderName,
            uploadLinkId: uploadLink.id,
            originalName: file.name,
            sanitizedName: validation.sanitizedFilename,
            isDirectUpload: false
          }
        }
      });

      uploadedDocuments.push(document);

      // Create activity record for each file
      await prisma.activity.create({
        data: {
          type: 'UPLOAD',
          description: `File "${validation.sanitizedFilename}" uploaded via upload link to folder: ${folderName}`,
          employeeId: uploadLink.employee.id,
          documentId: document.id,
          companyId: uploadLink.employee.companyId,
          metadata: {
            uploadLinkId: uploadLink.id,
            size: file.size,
            mimeType: file.type,
            folderId: folder.id
          }
        }
      });
    }

    // Update the use count and status
    const newUseCount = currentUseCount + 1;
    await prisma.uploadLink.update({
      where: { id: uploadLink.id },
      data: { 
        useCount: newUseCount,
        used: newUseCount >= uploadLink.maxUses,
        // If we've reached max uses, mark it as expired
        ...(uploadLink.maxUses && newUseCount >= uploadLink.maxUses 
          ? { expiresAt: new Date() } 
          : {})
      }
    });

    return NextResponse.json({
      success: true,
      documents: uploadedDocuments.map(doc => ({ id: doc.id, name: doc.name })),
      remainingUses: uploadLink.maxUses ? uploadLink.maxUses - newUseCount : null
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 