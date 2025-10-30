import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// GET: Download a document file
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

    // Read and return file
    const filePath = join(UPLOAD_DIR, document.path);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileContent = await readFile(filePath);
    const response = new NextResponse(fileContent);
    response.headers.set('Content-Type', document.mimeType);
    response.headers.set('Content-Disposition', `inline; filename="${document.name}"`);
    
    return response;
  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

