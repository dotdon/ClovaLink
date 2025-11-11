import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessFolder, canManageDocument } from '@/lib/permissions';

// GET - Fetch memos for a document or folder
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const folderId = searchParams.get('folderId');

    if (!documentId && !folderId) {
      return NextResponse.json({ error: 'Either documentId or folderId is required' }, { status: 400 });
    }

    // Check permissions
    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      if (!canManageDocument(session, document)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
      });

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }

      if (!canAccessFolder(session, folder)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch memos
    const memos = await prisma.memo.findMany({
      where: {
        ...(documentId && { documentId }),
        ...(folderId && { folderId }),
        companyId: session.user.companyId,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({ memos });
  } catch (error: any) {
    console.error('Error fetching memos:', error);
    return NextResponse.json({ error: 'Failed to fetch memos' }, { status: 500 });
  }
}

// POST - Create a new memo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, documentId, folderId } = body;

    if (!content || (!documentId && !folderId)) {
      return NextResponse.json(
        { error: 'Content and either documentId or folderId are required' },
        { status: 400 }
      );
    }

    // Check permissions
    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      if (!canManageDocument(session, document)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
      });

      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }

      if (!canAccessFolder(session, folder)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Create memo
    const memo = await prisma.memo.create({
      data: {
        content,
        documentId: documentId || null,
        folderId: folderId || null,
        employeeId: session.user.id,
        companyId: session.user.companyId,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, memo }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating memo:', error);
    return NextResponse.json({ error: 'Failed to create memo' }, { status: 500 });
  }
}

