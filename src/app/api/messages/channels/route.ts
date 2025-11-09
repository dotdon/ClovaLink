import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: Fetch all channels for the user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch channels where user is a member
    const channels = await prisma.messageChannel.findMany({
      where: {
        members: {
          some: {
            employeeId: session.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
                isActive: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new channel (group chat)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, memberIds, companyId, isPublic } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'At least one member is required' }, { status: 400 });
    }

    // Create the channel
    const channel = await prisma.messageChannel.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        companyId: companyId || session.user.companyId,
        isPublic: isPublic !== undefined ? isPublic : false,
        members: {
          create: [
            // Add the creator as admin
            {
              employeeId: session.user.id,
              isAdmin: true,
            },
            // Add other members
            ...memberIds
              .filter((id: string) => id !== session.user.id)
              .map((id: string) => ({
                employeeId: id,
                isAdmin: false,
              })),
          ],
        },
      },
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    // Create notifications for all members
    const notifications = memberIds
      .filter((id: string) => id !== session.user.id)
      .map((id: string) => ({
        employeeId: id,
        type: 'channel_invite',
        title: 'Added to Group Chat',
        body: `${session.user.name} added you to ${name}`,
        data: {
          channelId: channel.id,
        },
      }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications,
      });
    }

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update channel (add/remove members, update info)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, action, name, description, memberIds } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Check if user is admin of the channel
    const membership = await prisma.channelMember.findFirst({
      where: {
        channelId,
        employeeId: session.user.id,
        isAdmin: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized: You must be an admin of this channel' }, { status: 403 });
    }

    if (action === 'add_members' && memberIds && Array.isArray(memberIds)) {
      // Add new members
      const existingMembers = await prisma.channelMember.findMany({
        where: {
          channelId,
          employeeId: { in: memberIds },
        },
      });

      const existingMemberIds = existingMembers.map(m => m.employeeId);
      const newMemberIds = memberIds.filter(id => !existingMemberIds.includes(id));

      if (newMemberIds.length > 0) {
        await prisma.channelMember.createMany({
          data: newMemberIds.map(id => ({
            channelId,
            employeeId: id,
            isAdmin: false,
          })),
        });

        // Get channel name for notification
        const channel = await prisma.messageChannel.findUnique({
          where: { id: channelId },
        });

        // Create notifications
        await prisma.notification.createMany({
          data: newMemberIds.map(id => ({
            employeeId: id,
            type: 'channel_invite',
            title: 'Added to Group Chat',
            body: `${session.user.name} added you to ${channel?.name || 'a group chat'}`,
            data: {
              channelId,
            },
          })),
        });
      }
    } else if (action === 'remove_member' && memberIds && memberIds.length === 1) {
      // Remove a member
      await prisma.channelMember.deleteMany({
        where: {
          channelId,
          employeeId: memberIds[0],
        },
      });
    } else if (action === 'update_info') {
      // Update channel name/description
      await prisma.messageChannel.update({
        where: { id: channelId },
        data: {
          name: name?.trim() || undefined,
          description: description?.trim() || undefined,
        },
      });
    }

    // Fetch updated channel
    const updatedChannel = await prisma.messageChannel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ channel: updatedChannel });
  } catch (error) {
    console.error('Error updating channel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Leave or delete a channel
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Check if user is the last admin
    const membership = await prisma.channelMember.findFirst({
      where: {
        channelId,
        employeeId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this channel' }, { status: 404 });
    }

    // If user is admin, check if there are other admins
    if (membership.isAdmin) {
      const otherAdmins = await prisma.channelMember.count({
        where: {
          channelId,
          isAdmin: true,
          employeeId: { not: session.user.id },
        },
      });

      // If no other admins, delete the entire channel
      if (otherAdmins === 0) {
        await prisma.messageChannel.delete({
          where: { id: channelId },
        });
        return NextResponse.json({ message: 'Channel deleted successfully' });
      }
    }

    // Otherwise, just remove the user from the channel
    await prisma.channelMember.delete({
      where: { id: membership.id },
    });

    return NextResponse.json({ message: 'Left channel successfully' });
  } catch (error) {
    console.error('Error leaving/deleting channel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

