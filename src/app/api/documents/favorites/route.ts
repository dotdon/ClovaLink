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

    // Get favorite documents
    const favoriteDocuments = await prisma.favoriteDocument.findMany({
      where: { employeeId: session.user.id },
      include: {
        document: {
          include: {
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get favorite folders
    const favoriteFolders = await prisma.favoriteFolder.findMany({
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
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      documents: favoriteDocuments,
      folders: favoriteFolders
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

