import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { folderId, documentId, expiresInDays = 7 } = body;

    if (!folderId && !documentId) {
      return NextResponse.json(
        { error: 'Either folderId or documentId must be provided' },
        { status: 400 }
      );
    }

    // Verify ownership
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId }
      });
      if (!folder || folder.companyId !== employee.companyId) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
    }

    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });
      if (!document || document.companyId !== employee.companyId) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
    }

    // Create download link
    const downloadLink = await prisma.downloadLink.create({
      data: {
        token: generateToken(),
        folderId,
        documentId,
        createdById: employee.id,
        companyId: employee.companyId,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      }
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'CREATE_LINK',
        description: `Created download link for ${folderId ? 'folder' : 'document'}`,
        employeeId: employee.id,
        documentId,
        companyId: employee.companyId,
        metadata: {
          linkId: downloadLink.id,
          expiresAt: downloadLink.expiresAt
        }
      }
    });

    return NextResponse.json({
      downloadLink: {
        ...downloadLink,
        url: `${process.env.NEXTAUTH_URL}/download/${downloadLink.token}`
      }
    });

  } catch (error) {
    console.error('Error creating download link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 