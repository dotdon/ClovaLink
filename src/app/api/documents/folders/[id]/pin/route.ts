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

    // Get the next order number
    const maxOrder = await prisma.pinnedFolder.findFirst({
      where: { employeeId: session.user.id },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    // Create or get existing pinned folder
    const pinned = await prisma.pinnedFolder.upsert({
      where: {
        employeeId_folderId: {
          employeeId: session.user.id,
          folderId
        }
      },
      update: {},
      create: {
        employeeId: session.user.id,
        folderId,
        order: (maxOrder?.order ?? -1) + 1
      }
    });

    return NextResponse.json({ success: true, pinned });
  } catch (error) {
    console.error('Error pinning folder:', error);
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

    // Remove pinned folder
    await prisma.pinnedFolder.deleteMany({
      where: {
        employeeId: session.user.id,
        folderId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unpinning folder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

