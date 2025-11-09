import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageIds } = await request.json();

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: 'Message IDs are required' }, { status: 400 });
    }

    // Get messages to check for disappearAfter setting
    const messages = await prisma.message.findMany({
      where: {
        id: { in: messageIds },
        recipientId: session.user.id,
      },
    });

    // Mark messages as read and start disappear timer if needed
    for (const message of messages) {
      const updateData: any = {
        isRead: true,
      };

      // If message has disappearAfter and hasn't been read yet, set expiration
      if (message.disappearAfter && !message.isRead && !message.expiresAt) {
        const expiresAt = new Date(Date.now() + message.disappearAfter * 1000);
        updateData.expiresAt = expiresAt;
      }

      await prisma.message.update({
        where: { id: message.id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

