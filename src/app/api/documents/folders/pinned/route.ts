import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pinned folders
    const pinnedFolders = await prisma.pinnedFolder.findMany({
      where: { employeeId: session.user.id },
      include: {
        folder: {
          include: {
            company: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                documents: true,
                children: true
              }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ folders: pinnedFolders });
  } catch (error) {
    console.error('Error fetching pinned folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

