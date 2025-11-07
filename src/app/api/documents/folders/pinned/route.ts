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

    // Get pinned folders
    const pinnedFolders = await prisma.pinnedFolder.findMany({
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
      orderBy: { order: 'asc' }
    });

    // Process folders to add hasPassword flag and keep password info (needed for verification)
    const processedFolders = pinnedFolders.map(item => ({
      ...item,
      folder: {
        ...item.folder,
        hasPassword: !!item.folder.password,
        // Keep password for server-side verification, it's hashed so safe to send
        password: item.folder.password
      }
    }));

    console.log('Pinned folders:', processedFolders.map(f => ({
      name: f.folder.name,
      hasPassword: f.folder.hasPassword,
      passwordExists: !!f.folder.password
    })));

    return NextResponse.json({ folders: processedFolders });
  } catch (error) {
    console.error('Error fetching pinned folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

