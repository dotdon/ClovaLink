import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch messages for a specific employee (admin only)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view user messages
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const conversationWith = searchParams.get('conversationWith');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    let messages;

    if (conversationWith) {
      // Fetch conversation between two specific users
      const rawMessages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: employeeId, recipientId: conversationWith },
            { senderId: conversationWith, recipientId: employeeId },
          ],
          deletedForEveryone: false, // Don't show deleted messages
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profilePicture: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
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
          createdAt: 'desc',
        },
        take: 100, // Limit to last 100 messages
      });

      // Sanitize ALL message content - admins cannot read user messages for privacy
      messages = rawMessages.map((msg: any) => ({
        ...msg,
        content: '[Message Content Hidden for Privacy]',
        encryptedKey: null, // Don't send encryption keys
        iv: null, // Don't send IVs
        isEncrypted: true, // Mark as encrypted for UI consistency
      }));
    } else {
      // Fetch all conversations for the employee
      const conversations = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: employeeId },
            { recipientId: employeeId },
          ],
          deletedForEveryone: false,
          channelId: null, // Only direct messages for now
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profilePicture: true,
            },
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      // Group conversations by participant
      const conversationMap = new Map();
      
      conversations.forEach((message: any) => {
        const otherUserId = message.senderId === employeeId ? message.recipientId : message.senderId;
        if (!otherUserId) return;

        if (!conversationMap.has(otherUserId)) {
          const otherUser = message.senderId === employeeId ? message.recipient : message.sender;
          
          // Sanitize ALL message content for privacy
          const sanitizedMessage = {
            ...message,
            content: '[Hidden]',
            encryptedKey: null,
            iv: null,
            isEncrypted: true,
          };
          
          conversationMap.set(otherUserId, {
            participant: otherUser,
            lastMessage: sanitizedMessage,
            messageCount: 1,
          });
        } else {
          conversationMap.get(otherUserId).messageCount++;
        }
      });

      return NextResponse.json({
        conversations: Array.from(conversationMap.values()),
      });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

