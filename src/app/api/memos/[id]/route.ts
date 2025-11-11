import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Update a memo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Find the memo
    const existingMemo = await prisma.memo.findUnique({
      where: { id },
    });

    if (!existingMemo) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    // Check if user owns the memo or is admin/manager
    const isOwner = existingMemo.employeeId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    const isManager = session.user.role === 'MANAGER' && existingMemo.companyId === session.user.companyId;

    if (!isOwner && !isAdmin && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update memo
    const updatedMemo = await prisma.memo.update({
      where: { id },
      data: {
        content,
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

    return NextResponse.json({ success: true, memo: updatedMemo });
  } catch (error: any) {
    console.error('Error updating memo:', error);
    return NextResponse.json({ error: 'Failed to update memo' }, { status: 500 });
  }
}

// DELETE - Delete a memo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Find the memo
    const existingMemo = await prisma.memo.findUnique({
      where: { id },
    });

    if (!existingMemo) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    // Check if user owns the memo or is admin/manager
    const isOwner = existingMemo.employeeId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    const isManager = session.user.role === 'MANAGER' && existingMemo.companyId === session.user.companyId;

    if (!isOwner && !isAdmin && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete memo
    await prisma.memo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Memo deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting memo:', error);
    return NextResponse.json({ error: 'Failed to delete memo' }, { status: 500 });
  }
}

