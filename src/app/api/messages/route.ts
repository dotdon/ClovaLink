import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: Fetch messages (direct messages or channel messages)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId');
    const channelId = searchParams.get('channelId');

    let messages;

    if (recipientId) {
      // Fetch direct messages between two users
      messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: session.user.id, recipientId },
            { senderId: recipientId, recipientId: session.user.id },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
          attachments: {
            include: {
              document: {
                select: {
                  id: true,
                  name: true,
                  mimeType: true,
                  size: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    } else if (channelId) {
      // Fetch channel messages
      messages = await prisma.message.findMany({
        where: {
          channelId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
          attachments: {
            include: {
              document: {
                select: {
                  id: true,
                  name: true,
                  mimeType: true,
                  size: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    } else {
      // Fetch all conversations for the user
      const conversations = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: session.user.id },
            { recipientId: session.user.id },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      return NextResponse.json({ conversations });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Send a new message
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, recipientId, channelId, documentIds } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (!recipientId && !channelId) {
      return NextResponse.json({ error: 'Recipient or channel is required' }, { status: 400 });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content,
        senderId: session.user.id,
        recipientId: recipientId || null,
        channelId: channelId || null,
        attachments: documentIds && documentIds.length > 0 ? {
          create: documentIds.map((docId: string) => ({
            documentId: docId,
          })),
        } : undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        attachments: {
          include: {
            document: {
              select: {
                id: true,
                name: true,
                mimeType: true,
                size: true,
              },
            },
          },
        },
      },
    });

    // Create notification for recipient
    if (recipientId) {
      await prisma.notification.create({
        data: {
          employeeId: recipientId,
          type: 'message',
          title: 'New Message',
          body: `${session.user.name} sent you a message`,
          data: {
            messageId: message.id,
            senderId: session.user.id,
          },
          messageId: message.id,
        },
      });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

