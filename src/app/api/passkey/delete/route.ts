import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const passkeyId = searchParams.get('id');

    if (!passkeyId) {
      return NextResponse.json(
        { error: 'Passkey ID is required' },
        { status: 400 }
      );
    }

    // Verify the passkey belongs to the user
    const passkey = await prisma.passkey.findFirst({
      where: {
        id: passkeyId,
        employeeId: session.user.id,
      },
    });

    if (!passkey) {
      return NextResponse.json(
        { error: 'Passkey not found' },
        { status: 404 }
      );
    }

    // Delete the passkey
    await prisma.passkey.delete({
      where: { id: passkeyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting passkey:', error);
    return NextResponse.json(
      { error: 'Failed to delete passkey' },
      { status: 500 }
    );
  }
}

