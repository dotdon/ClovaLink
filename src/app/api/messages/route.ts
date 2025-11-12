import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Route segment config to prevent timeouts on fast navigation
// Shorter timeout to fail fast rather than hang
export const maxDuration = 15;
export const dynamic = 'force-dynamic';

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

      const convResponse = NextResponse.json({ conversations });
      // Cache conversations list for 10 seconds
      convResponse.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=20');
      return convResponse;
    }

    // Filter out deleted and expired messages
    const now = new Date();
    const filteredMessages = messages.filter((message: any) => {
      // Delete for everyone check
      if (message.deletedForEveryone) {
        return false;
      }

      // Delete for me check
      if (message.deletedFor && message.deletedFor.includes(session.user.id)) {
        return false;
      }

      // Check if message has expired
      if (message.expiresAt && new Date(message.expiresAt) < now) {
        // Delete expired message in background (don't await to not slow down response)
        prisma.message.delete({ where: { id: message.id } }).catch(err => 
          console.error('Error deleting expired message:', err)
        );
        return false;
      }

      return true;
    });

    const response = NextResponse.json({ messages: filteredMessages });
    // Cache messages for 5 seconds to reduce load on frequent polling
    response.headers.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=10');
    return response;
  } catch (error) {
    console.error('Error fetching messages:', error);
    // Always return a response, even on error
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
    const { content, recipientId, channelId, documentIds, encryptedKey, iv, isEncrypted, disappearAfter } = body;

    // Allow empty content if there are attachments
    if ((!content || content.trim() === '') && (!documentIds || documentIds.length === 0)) {
      return NextResponse.json({ error: 'Message content or attachments are required' }, { status: 400 });
    }

    if (!recipientId && !channelId) {
      return NextResponse.json({ error: 'Recipient or channel is required' }, { status: 400 });
    }

    // Store disappearAfter duration (expiration will be set when message is read)
    const disappearAfterValue = disappearAfter && typeof disappearAfter === 'number' && disappearAfter > 0 
      ? disappearAfter 
      : null;

    // Create the message
    const message = await prisma.message.create({
      data: {
        content: content || '📎 Attachment',
        encryptedKey: encryptedKey || null,
        iv: iv || null,
        isEncrypted: isEncrypted !== undefined ? isEncrypted : true,
        senderId: session.user.id,
        recipientId: recipientId || null,
        channelId: channelId || null,
        disappearAfter: disappearAfterValue,
        expiresAt: null, // Will be set when message is read
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

    // Emit WebSocket event for real-time delivery
    try {
      const io = (global as any).io;
      if (io) {
        if (recipientId) {
          // Direct message - emit to both sender's and recipient's rooms + conversation room
          const conversationId = [session.user.id, recipientId].sort().join('-');
          io.to(`user:${session.user.id}`).emit('new-message', message); // Sender sees their own message
          io.to(`user:${recipientId}`).emit('new-message', message);      // Recipient gets notified
          io.to(`conversation:${conversationId}`).emit('new-message', message); // Anyone in the conversation room
          console.log(`📤 WebSocket: Message delivered to sender ${session.user.id} and recipient ${recipientId}`);
        } else if (channelId) {
          // Channel message - emit to channel room
          io.to(`channel:${channelId}`).emit('new-message', message);
          console.log(`📤 WebSocket: Channel message delivered to ${channelId}`);
        }
      }
    } catch (wsError) {
      // WebSocket error shouldn't fail the API call
      console.error('WebSocket emit error (non-critical):', wsError);
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

