import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: folderId } = await params;

    // Check if folder exists
    const folder = await prisma.folder.findUnique({
      where: { id: folderId }
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Create or get existing favorite
    const favorite = await prisma.favoriteFolder.upsert({
      where: {
        employeeId_folderId: {
          employeeId: session.user.id,
          folderId
        }
      },
      update: {},
      create: {
        employeeId: session.user.id,
        folderId
      }
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error) {
    console.error('Error favoriting folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: folderId } = await params;

    // Remove favorite
    await prisma.favoriteFolder.deleteMany({
      where: {
        employeeId: session.user.id,
        folderId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unfavoriting folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

