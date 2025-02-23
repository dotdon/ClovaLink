import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete upload links
    if (!hasPermission(session, Permission.CREATE_UPLOAD_LINKS)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Find the upload link and verify ownership
    const uploadLink = await prisma.uploadLink.findFirst({
      where: {
        id: params.id,
        employeeId: session.user.id,
      },
      include: {
        employee: {
          select: {
            companyId: true
          }
        }
      }
    });

    if (!uploadLink) {
      return NextResponse.json({ error: 'Upload link not found' }, { status: 404 });
    }

    // Delete the upload link
    await prisma.uploadLink.delete({
      where: { id: params.id },
    });

    // Create activity record for the deletion
    await prisma.activity.create({
      data: {
        type: 'UPLOAD_LINK_DELETED',
        description: uploadLink.name 
          ? `Deleted upload link "${uploadLink.name}"`
          : 'Deleted upload link',
        employeeId: session.user.id,
        companyId: uploadLink.employee.companyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Upload link deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting upload link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 