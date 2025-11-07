import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');

    // Get favorite documents
    const favoriteDocuments = await prisma.favoriteDocument.findMany({
      where: { 
        employeeId: session.user.id,
        ...(companyId && {
          document: {
            companyId: companyId
          }
        })
      },
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
      where: { 
        employeeId: session.user.id,
        ...(companyId && {
          folder: {
            companyId: companyId
          }
        })
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            parentId: true,
            companyId: true,
            createdById: true,
            color: true,
            password: true, // Explicitly include password field
            createdAt: true,
            updatedAt: true,
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

    // Process folders to add hasPassword flag and remove password hash
    const processedFolders = favoriteFolders.map(item => ({
      ...item,
      folder: {
        ...item.folder,
        hasPassword: !!item.folder.password,
        password: undefined // Don't expose password hash
      }
    }));

    return NextResponse.json({
      documents: favoriteDocuments,
      folders: processedFolders
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

