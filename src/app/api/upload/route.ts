import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { existsSync } from 'fs';

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the employee's company ID
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { companyId: true }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Ensure uploads directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Use original filename
    const filename = file.name;
    const filepath = join(UPLOAD_DIR, filename);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file to disk
    await writeFile(filepath, buffer);

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        name: file.name,
        path: filepath,
        mimeType: file.type,
        size: file.size,
        employeeId: session.user.id,
        companyId: employee.companyId,
        metadata: {
          folder: null, // Explicitly set folder to null for root-level display
          isDirectUpload: true // Mark as direct upload for UI handling
        }
      },
    });

    // Create activity record
    await prisma.activity.create({
      data: {
        type: 'UPLOAD',
        description: `Uploaded document: ${file.name}`,
        employeeId: session.user.id,
        documentId: document.id,
        companyId: employee.companyId,
      },
    });

    return NextResponse.json({
      documentId: document.id,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 