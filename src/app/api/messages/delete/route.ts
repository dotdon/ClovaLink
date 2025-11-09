import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, deleteForEveryone } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Get the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
        recipient: true,
        channel: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if user is the sender for delete for everyone
    if (deleteForEveryone) {
      if (message.senderId !== session.user.id) {
        return NextResponse.json(
          { error: 'Only the sender can delete a message for everyone' },
          { status: 403 }
        );
      }

      // Delete for everyone - set the flag
      await prisma.message.update({
        where: { id: messageId },
        data: {
          deletedForEveryone: true,
          content: '[Message deleted]',
          // Clear attachments
          attachments: {
            deleteMany: {},
          },
        },
      });

      return NextResponse.json({ success: true, deletedForEveryone: true });
    } else {
      // Delete for me only - add user ID to deletedFor array
      const currentDeletedFor = message.deletedFor || [];
      
      if (!currentDeletedFor.includes(session.user.id)) {
        await prisma.message.update({
          where: { id: messageId },
          data: {
            deletedFor: {
              push: session.user.id,
            },
          },
        });
      }

      return NextResponse.json({ success: true, deletedForEveryone: false });
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

