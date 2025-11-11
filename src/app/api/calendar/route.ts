import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';

// GET: Fetch calendar events
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, Permission.VIEW_CALENDAR)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {
      OR: [
        // Personal events created by user
        { createdById: session.user.id, isPrivate: true },
        // Company events user can see
        { companyId: session.user.companyId, isPrivate: false },
        // Events user is attending
        { attendees: { some: { employeeId: session.user.id } } },
      ],
    };

    // Add date filters if provided
    if (startDate && endDate) {
      where.AND = [
        { startDate: { lte: new Date(endDate) } },
        { endDate: { gte: new Date(startDate) } },
      ];
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        attendees: {
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
        },
        reminders: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    const response = NextResponse.json({ events });
    // Cache for 30 seconds
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new calendar event
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, Permission.CREATE_EVENTS)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      location,
      color,
      type,
      priority,
      status,
      isPrivate,
      companyId,
      attendeeIds,
      reminderMinutes,
    } = body;

    // Validate required fields
    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Check if creating company event
    if (companyId && !isPrivate) {
      if (!hasPermission(session, Permission.MANAGE_COMPANY_EVENTS)) {
        return NextResponse.json(
          { error: 'Permission denied to create company-wide events' },
          { status: 403 }
        );
      }
    }

    // Create the event
    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        allDay: allDay || false,
        location: location || null,
        color: color || null,
        type: type || 'TASK',
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        isPrivate: isPrivate !== undefined ? isPrivate : true,
        createdById: session.user.id,
        companyId: companyId || null,
        attendees: attendeeIds && attendeeIds.length > 0 ? {
          create: attendeeIds.map((empId: string) => ({
            employeeId: empId,
            status: 'PENDING',
          })),
        } : undefined,
        reminders: reminderMinutes && reminderMinutes.length > 0 ? {
          create: reminderMinutes.map((minutes: number) => ({
            minutesBefore: minutes,
          })),
        } : undefined,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        reminders: true,
      },
    });

    // Create notifications for attendees
    if (attendeeIds && attendeeIds.length > 0) {
      await Promise.all(
        attendeeIds.map(async (attendeeId: string) => {
          if (attendeeId !== session.user.id) {
            await prisma.notification.create({
              data: {
                employeeId: attendeeId,
                type: 'calendar_invite',
                title: 'Calendar Invitation',
                body: `${session.user.name} invited you to: ${title}`,
                data: {
                  eventId: event.id,
                  creatorId: session.user.id,
                },
              },
            });
          }
        })
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update an existing event
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Get existing event
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user can edit this event
    const canEdit = 
      existingEvent.createdById === session.user.id || // Creator can edit
      session.user.role === 'ADMIN' || // Admins can edit all
      (session.user.role === 'MANAGER' && existingEvent.companyId === session.user.companyId); // Managers can edit company events

    if (!canEdit) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update the event
    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...updateData,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        reminders: true,
      },
    });

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete an event
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Get existing event
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user can delete this event
    const canDelete = 
      existingEvent.createdById === session.user.id || // Creator can delete
      session.user.role === 'ADMIN'; // Admins can delete all

    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

