import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Create or get existing favorite
    const favorite = await prisma.favoriteDocument.upsert({
      where: {
        employeeId_documentId: {
          employeeId: session.user.id,
          documentId
        }
      },
      update: {},
      create: {
        employeeId: session.user.id,
        documentId
      }
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error) {
    console.error('Error favoriting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    // Remove favorite
    await prisma.favoriteDocument.deleteMany({
      where: {
        employeeId: session.user.id,
        documentId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unfavoriting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

