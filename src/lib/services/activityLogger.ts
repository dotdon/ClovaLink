import { Activity } from '@prisma/client';
import prisma from '../prisma';
import { createLogger, logError } from '../logger';

const logger = createLogger('activity');

export type ActivityType = 'VIEW' | 'DOWNLOAD' | 'EDIT' | 'DELETE' | 'UPLOAD' | 'SHARE';

interface LogActivityParams {
  type: ActivityType;
  description: string;
  employeeId: string;
  documentId?: string;
  companyId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

interface ActivityWithRelations extends Activity {
  employee: {
    name: string;
    email: string;
  };
  document?: {
    name: string;
  };
}

export async function logActivity({
  type,
  description,
  employeeId,
  documentId,
  companyId,
  metadata,
  ipAddress,
  userAgent,
}: LogActivityParams) {
  try {
    const activity = await prisma.activity.create({
      data: {
        type,
        description,
        employeeId,
        documentId,
        companyId,
        metadata,
        ipAddress,
        userAgent,
      },
      include: {
        employee: {
          select: {
            name: true,
            email: true,
          },
        },
        document: {
          select: {
            name: true,
          },
        },
      },
    });

    // If you want to implement real-time notifications, you could emit an event here
    // await notifyRelevantUsers(activity);

    logger.debug({ type, employeeId, documentId, companyId }, 'Activity logged');
    return activity;
  } catch (error) {
    logError(error, { type, employeeId, documentId, companyId, context: 'logActivity' });
    // Don't throw the error - we don't want to break the main functionality
    // if activity logging fails
    return null;
  }
}

export async function getActivities({
  companyId,
  employeeId,
  documentId,
  type,
  from,
  to,
  limit = 50,
  offset = 0,
}: {
  companyId?: string;
  employeeId?: string;
  documentId?: string;
  type?: ActivityType;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  const where = {
    ...(companyId && { companyId }),
    ...(employeeId && { employeeId }),
    ...(documentId && { documentId }),
    ...(type && { type }),
    ...(from || to ? {
      timestamp: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    } : {}),
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            email: true,
          },
        },
        document: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    activities,
    total,
    hasMore: offset + activities.length < total,
  };
}

// Helper function to format activity for display
export function formatActivity(activity: ActivityWithRelations) {
  const actor = activity.employee.name;
  const documentName = activity.document?.name;
  
  const typeFormatting: Record<ActivityType, string> = {
    VIEW: 'viewed',
    DOWNLOAD: 'downloaded',
    EDIT: 'edited',
    DELETE: 'deleted',
    UPLOAD: 'uploaded',
    SHARE: 'shared',
  };

  if (documentName) {
    return `${actor} ${typeFormatting[activity.type as ActivityType]} "${documentName}"`;
  }

  return activity.description;
} 